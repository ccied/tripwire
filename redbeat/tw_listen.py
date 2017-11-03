
import time
import redbeat
import redis
import sys

LAST_UPDATE = {}


ERROR_CHANNEL = "tw:log:redbeat:error"
ALERT_CHANNEL = "tw:log:redbeat:alert"


def red(msg):
    return "[31m{}[0m".format(msg)


def green(msg):
    return "[32m{}[0m".format(msg)


def get_screen_drawer(listener):
    sys.stdout.write("[2J")  # Clear screen
    db = listener.get_hosts()

    def draw_screen(
            changed_name=None, _changed_status=None, _changed_data=None):
        LAST_UPDATE[changed_name] = time.time()

        sys.stdout.write("[H")  # Return home
        for name, (alive, data) in sorted(db.items()):
            datestamp = "UNKNOWN"
            if name in LAST_UPDATE:
                datestamp = time.strftime(
                    "%Y-%m-%d %H:%M:%S",
                    time.localtime(LAST_UPDATE[name]))
            sys.stdout.write("  {:15s} {:<10} {:20} {}{}[K\n".format(
                name, green("ALIVE") if alive else red("DEAD "),
                datestamp,
                "({})".format(data) if data is not None else "",
                " *****" if name == changed_name else ""))
        sys.stdout.write("[K[J")
        sys.stdout.flush()
    return draw_screen


class FailChecker(object):
    _dead = None

    def __init__(self):
        self._redis = redis.Redis()
        self._dead = set()

    def fail_check(self,
                   changed_name=None, changed_status=None, _changed_data=None):
        #print changed_name, changed_status
        if changed_status == redbeat.Status.DEAD:
            self._redis.publish(ERROR_CHANNEL, "{} died".format(changed_name))
            self._dead.add(changed_name)

        if (changed_status == redbeat.Status.ALIVE and
                changed_name in self._dead):
            self._redis.publish(
                ALERT_CHANNEL, "{} restored".format(changed_name))
            self._dead.remove(changed_name)


def simple_screen(name, status, data=None):
    print name, status, data


def main():
    listener = redbeat.Listener(beat_timeout=15, remove_after=0)
    listener.start()
    draw_screen = get_screen_drawer(listener)
    fail_checker = FailChecker()
    listener.add_callback(draw_screen)
    listener.add_callback(fail_checker.fail_check)

    try:
        while True:
            time.sleep(10)
    except KeyboardInterrupt:
        pass

if __name__ == "__main__":
    main()


