"""Tripwire logging wrappers."""

import os
import redis
import time

CHANNEL_LOG_PREFIX         = "tw:log:runner"

_COLOR_RESET   = "\x1b[00m"
_COLOR_NONE    = ""
_COLOR_RED     = "\x1b[1;31m"
_COLOR_BLUE    = "\x1b[1;34m"
_COLOR_GREEN   = "\x1b[1;32m"
_COLOR_MAGENTA = "\x1b[1;35m"
_COLOR_CYAN    = "\x1b[1;36m"
_COLOR_WHITE   = "\x1b[1;37m"
_COLOR_YELLOW  = "\x1b[1;33m"

_COLOR_DIM_GREEN  = "\x1b[2;32m"


class TeeStream(object):
    # Based on https://gist.github.com/327585 by Anand Kunal
    def __init__(self, *args):
        self.streams = []
        self.streams.extend(args)
        self.__missing_method_name = None  # Hack!

    def __getattribute__(self, name):
        return object.__getattribute__(self, name)

    def __getattr__(self, name):
        self.__missing_method_name = name  # Could also be a property
        return getattr(self, '__methodmissing__')

    def __methodmissing__(self, *args, **kwargs):
        # Emit method call to the log copy
        res = None
        for stream in self.streams:
            func = getattr(stream, self.__missing_method_name)
            res = func(*args, **kwargs)
        return res


class Logger(object):
    def __init__(self, stream):
        self._stream = stream
        self._redis_conn = redis.Redis()    #pylint: disable=C0103

    def publish(self, channel, message):
        """Publishes to redis."""
        self._redis_conn.publish(channel, message)

    def log(self, severity, *args, **kwargs):
        """Log the args appropriately at the given severity level."""
        if not kwargs.get("no_publish", False):
            pid = os.getpid()
            self.publish("{}:{}:{}".format(CHANNEL_LOG_PREFIX, pid, severity),
                         " ".join(str(x) for x in args))

        color = kwargs.get("color", _COLOR_NONE)

        stream = self._stream
        stream.write(
            "{tcolor}{time} {color}{severity:>7} {msg}{reset}\n".format(
                time=time.strftime("%H:%M:%S %y-%m-%d"),
                severity=severity, msg=" ".join(str(x) for x in args),
                color=color, reset=_COLOR_RESET, tcolor=_COLOR_DIM_GREEN))
        stream.flush()

    def magenta(self, *args):
        """Log that magenta message, yo."""
        self.log("=", *args, no_publish=True, color=_COLOR_MAGENTA)

    def green(self, *args):
        """Log that green message, yo."""
        self.log("=", *args, no_publish=True, color=_COLOR_GREEN)

    def debug(self, *args):
        """Log that debug, yo."""
        self.log("debug", *args, color=_COLOR_BLUE)
        #log("debug", *args, no_publish=True, color=_COLOR_BLUE)

    def info(self, *args):
        """Log that info, yo."""
        self.log("info", *args, color=_COLOR_CYAN)

    def warn(self, *args):
        """Log that warning, yo."""
        self.log("warning", *args, err=True, color=_COLOR_YELLOW)

    def warning(self, *args):
        """Alias for warn()."""
        self.warn(*args)

    def error(self, *args):
        """Log that error, yo."""
        self.log("error", *args, err=True, color=_COLOR_RED)


