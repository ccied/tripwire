"""Redbeat enables simple heartbeat monitoring via redis.

To add heartbeat reporting to your app, import this module, then add the
following line:
    start_redbeat(NAME)

where NAME is a unique identifier for this program. There are a bunch of
options, but perhaps the most useful one is the next argument, which is a small
string of data to send along with your heartbeat message. e.g.
    start_redbeat(my_name, my_ip)

To enable *monitoring*, import this module, then
    listener = redbeat.Listener(callback=my_callback)
    listener.start()

The callback will be called with (string name, Status status, string data)
triples. Data may be None.

"""

import enum as _enum
import redis as _redis
import sys as _sys
import time as _time
import threading as _threading


DEFAULT_BEAT_INTERVAL = 1
DEFAULT_BEAT_TIMEOUT = 10
DEFAULT_BEAT_REMOVAL_TIMEOUT = 0
DEFAULT_BEAT_CHANNEL_PREFIX = "redbeat:announce"

DEFAULT_UPDATE_FREQUENCY = 1

DEFAULT_NAMESPACE = "default"

Status = _enum.Enum(  # pylint: disable=C0103
    "Status", "ALIVE DEAD ADDED REMOVED UNCHANGED")


class _ListenerPoll(_threading.Thread):
    def __init__(self, listener, update_frequency=DEFAULT_UPDATE_FREQUENCY):
        super(_ListenerPoll, self).__init__()
        self.listener = listener
        self.update_frequency = update_frequency

    def _handle_host(self, item):
        name, (last_heard, data) = item

        status = Status.UNCHANGED

        now = _time.time()
        is_alive = (now - last_heard) < self.listener.beat_timeout
        to_remove = self.listener.remove_after and (
            (now - last_heard) > self.listener.remove_after)

        old_info = (False, None)
        if name in self.listener._summary:
            old_info = self.listener._summary[name]
        else:
            status = Status.ADDED

        self.listener._summary[name] = (is_alive, data)

        if status == Status.UNCHANGED and old_info != (is_alive, data):
            status = Status.ALIVE if is_alive else Status.DEAD
        elif status == Status.UNCHANGED and to_remove:
            status = Status.REMOVED

        #if status:
        #    self.listener.trigger_callback(name, status, data)

        return name, status, data

    def run(self):
        while not self.listener._exiting:
            to_act = []

            for item in self.listener._db.iteritems():
                name, _ = item
                results = self._handle_host(item)
                name, status, data = results
                if status != Status.UNCHANGED:
                    to_act.append(results)

            for name, status, data in to_act:
                if status == Status.REMOVED:
                    self.listener.delete_host(name)
                self.listener.trigger_callback(name, status, data)

            _time.sleep(self.update_frequency)


class Listener(_threading.Thread):
    _db = {}
    _summary = {}
    _callbacks = []

    _exiting = False

    def __init__(
            self, namespace=DEFAULT_NAMESPACE,
            redis_args=[], redis_kwargs={},
            beat_timeout=DEFAULT_BEAT_TIMEOUT,
            beat_channel_prefix=DEFAULT_BEAT_CHANNEL_PREFIX,
            remove_after=DEFAULT_BEAT_REMOVAL_TIMEOUT,
            callback=None):

        super(Listener, self).__init__()

        self.setDaemon(True)
        self.redis_conn = _redis.Redis(  #pylint: disable=W0142
            *redis_args, **redis_kwargs)

        self.beat_timeout = beat_timeout
        self.beat_channel = beat_channel_prefix + ":" + namespace
        self.remove_after = remove_after

        if callback:
            self.add_callback(callback)

    def exit(self):
        self._exiting = True

    def run(self):

        lp = _ListenerPoll(self)
        lp.setDaemon(True)
        lp.start()

        pubsub = self.redis_conn.pubsub()
        pubsub.subscribe([self.beat_channel])

        #import time
        #while True:
        #    while True:
        #        message = pubsub.get_message()
        #        if not message:
        #            break
        #        print message
        #    time.sleep(.1)

        for message in pubsub.listen():
            if message['type'] != 'message':
                continue

            name = message['data']
            data = None
            if " " in name:
                name, data = name.split(" ", 1)

            self._db[name] = (_time.time(), data)

            if self._exiting:
                break

    def get_hosts(self):
        return self._summary

    def delete_host(self, name):
        if name in self._db:
            del self._db[name]
        if name in self._summary:
            del self._summary[name]

    def trigger_callback(self, name, status, data):
        for callback in self._callbacks:
            callback(name, status, data)

    def add_callback(self, callback):
        self._callbacks.append(callback)

    def delete_callback(self, callback):
        if callback in self._callbacks:
            self._callbacks.remove(callback)


class Redbeat(_threading.Thread):
    name = None
    data = None

    def __init__(
            self, name, data=None, namespace=DEFAULT_NAMESPACE,
            redis_args=[], redis_kwargs={},
            beat_interval=DEFAULT_BEAT_INTERVAL,
            beat_channel_prefix=DEFAULT_BEAT_CHANNEL_PREFIX):
        super(Redbeat, self).__init__()
        self.setDaemon(True)

        self.redis_conn = _redis.Redis(*redis_args, **redis_kwargs)

        self.name = name
        self.data = data

        self.beat_interval = beat_interval
        self.beat_channel = beat_channel_prefix + ":" + namespace

    def set_data(self, data):
        self.data = data
        self._send_data()

    def set_name(self, name):
        self.name = name
        self._send_data()

    def _send_data(self):
        data = self.name + (
            " {}".format(self.data) if self.data is not None else "")
        self.redis_conn.publish(self.beat_channel, data)

    def run(self):
        while True:
            self._send_data()
            _time.sleep(self.beat_interval)


def start_redbeat(name, data=None):
    th = Redbeat(name, data)
    th.start()
    return th


def _main():
    # Stupid exmaple heartbeater
    hb = start_redbeat(_sys.argv[1], 0)

    try:
        for i in xrange(9):
            hb.set_data(i)
            _time.sleep(1)
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    _main()



