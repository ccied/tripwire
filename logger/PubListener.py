import redis
import threading
import time
import sys
import os
import socket
import math


class PubListener(threading.Thread):
    TIME_FORMAT             = "%Y-%m-%d %H:%M:%S %Z"
    ANNOUNCE_CHANNEL        = "tw:log:announce"
    CTRL_CHANNEL_PREFIX     = "tw:log:ctrl:host:"
    CTRL_CHANNEL_NAME_PREF  = "tw:log:ctrl:name:"
    CTRL_CHANNEL_ALL        = "tw:log:ctrl:all"

    def __getTime(self):
        return time.strftime(self.TIME_FORMAT, time.localtime())

    def __init__(self, channels, outfile, name=None,
                 justmessages=False, notime=False):

        threading.Thread.__init__(self)

        self.clean = False

        self.pid = str(os.getpid())
        self.dead = False

        self.hostPrefix = self.CTRL_CHANNEL_PREFIX + socket.getfqdn() + ":"
        self.hostCtrlChannel = self.hostPrefix + "all"
        self.controlChannel = self.hostPrefix + self.pid

        self.outfile = outfile

        self.ctrlChannels = [self.controlChannel,
                             self.hostCtrlChannel,
                             self.CTRL_CHANNEL_ALL]

        self.justmessages = justmessages
        self.notime = notime

        if name:
            self.nameCtrlChannel = self.CTRL_CHANNEL_NAME_PREF + name
            self.ctrlChannels = self.ctrlChannels + [self.nameCtrlChannel]
        else:
            self.nameCtrlChannel = None

        sublist = self.ctrlChannels + channels

        self.redis = redis.Redis()
        self.pubsub = self.redis.pubsub()
        self.pubsub.psubscribe(sublist)

        if name:
            self.redis.publish(self.ANNOUNCE_CHANNEL, "Starting log of " +
                               repr(channels) + " at " + name + "/" +
                               self.controlChannel)
        else:
            self.redis.publish(self.ANNOUNCE_CHANNEL, "Starting log of " +
                               repr(channels) + " at " + self.controlChannel)

    def __del__(self):
        self.pubsub.punsubscribe()
        if self.clean:
            self.redis.publish(self.ANNOUNCE_CHANNEL,
                               self.pid + " Exiting normally...")
            self.outfile.write(u"[" + self.__getTime() + "] Logger (" +
                               self.pid + ") exiting normally...\n")
        else:
            self.redis.publish(self.ANNOUNCE_CHANNEL,
                               self.pid + " CRASHED...")
            self.outfile.write(u"[" + self.__getTime() + "] Logger (" +
                               self.pid + ") CRASHED...\n")

        self.outfile.flush()
        self.outfile.close()

    def log(self, item):
        if type(item['data']) == str:
            lines = item['data'].split('\n')
        else:
            lines = [str(item['data'])]

        count = 1
        length = len(lines)
        width = int(math.ceil(math.log(length, 10)))
        for line in lines:
            if not self.notime:
                if item['type'] != 'pmessage' and item['type'] != 'message':
                    self.outfile.write(u"[" + self.__getTime() + "]" +
                                       " [" + item['type'] + "]" +
                                       " [" + item['channel'] + "]")
                else:
                    self.outfile.write(u"[" + self.__getTime() + "]" +
                                       " [" + item['channel'] + "]")

            if length > 1:
                self.outfile.write(u" ({0:{w}}/".format(count, w=width) +
                                   "{0:{w}})".format(length, w=width))

            if length > 1 or not self.notime:
                self.outfile.write(": ")

            self.outfile.write(unicode(line, errors='ignore') + u"\n")
            self.outfile.flush()
            count += 1

    def __handleControl(self, item):
        try:
            command, args = item['data'].split(' ', 1)
        except ValueError:
            command = item['data']

        if command == "KILL":
            self.dead = True
            self.kill("KILL_CMD")
            sys.exit(0)
        elif command == "RESTART":
            self.kill("RESTART_CMD")
            sys.exit(5)
        else:
            self.redis.publish(self.ANNOUNCE_CHANNEL,
                               self.pid + " Received unknown command...")

    def kill(self, origin="kill()"):
        r = redis.Redis()
        r.publish(self.ANNOUNCE_CHANNEL,
                  str(self.pid) + ' dying from ' + origin)
        self.clean = True

    def run(self):
        for item in self.pubsub.listen():
            #print repr(item)
            if (self.justmessages and item['type'] != 'pmessage' and
                    item['type'] != 'message'):
                continue

            self.log(item)

            if item['channel'] in self.ctrlChannels and \
               item['pattern'] in self.ctrlChannels:
                self.__handleControl(item)

            if self.dead:
                break
