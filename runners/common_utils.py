"""Common utilities for queueing and running."""

TRIPWIRE_ROOT              = "/cesr/tw"

CHANNEL_FUNCTION_CALL_FAIL = "tw:debug:function_call_fail"

CHANNEL_PUBLISH_STDERR     = "tw:debug:stderr"

PUBLISH_TIMINGS            = False
CHANNEL_FUNCTION_TIMINGS   = "tw:debug:function_call_timing"

CHANNEL_EVENT_PREFIX    = "tw:event:"
#CHANNEL_EVENT_PREFIX    = "tw:debug:event:"

# What channels to broadcast to
# When claiming an ID
CHANNEL_ID_USED         = CHANNEL_EVENT_PREFIX + "identity_used"
# When freeing an IID
CHANNEL_ID_FREED        = CHANNEL_EVENT_PREFIX + "identity_freed"
# On reg creation
CHANNEL_REG_SUCCEED     = CHANNEL_EVENT_PREFIX + "registration_created"

GLOBAL_ID_KEY           = "tw:global_id"

PROXY_HEALTH_HISTORY_KEY = "tw:proxies:fail_summary"


_PROXY_MAP = {
    "easy1": ["--proxy=BLANKED", "--proxy-type=http"],
    "easy2": ["--proxy=BLANKED", "--proxy-type=http"],
    "hard1": ["--proxy=BLANKED", "--proxy-type=http"],
    "hard2": ["--proxy=BLANKED", "--proxy-type=http"],
    "test1": ["--proxy=BLANKED", "--proxy-type=http"],
    "tor": ["--proxy=localhost:9050", "--proxy-type=socks5"],
    "easy2-manual-reg": ["--proxy=IGNORED", "--proxy-type=socks5"],
    "UNPROTECTED": [],
}

LIVE_DB = {
    "dbname": '',  # BLANKED
    "user": '',  # BLANKED
    "host": '',  # BLANKED
    "port": 0,  # BLANKED
    "password": "",  # BLANKED
}

DEBUG_DB = {
    "dbname": '',  # BLANKED
    "user": '',  # BLANKED
    "host": '',  # BLANKED
    "port": 0,  # BLANKED
    "password": '',  # BLANKED
}

DB = LIVE_DB

import contextlib
import os
import plumbum
import re
import time

import redis
import psycopg2

from common_queries import TripwireQueries

twlog = None  #pylint: disable=C0103


class AbortException(Exception):
    """Buncha things raise this to indicate that we need to die."""
    pass


class MissingProxyHistoryException(Exception):
    pass


def static_var(varname, value):
    """Decorator that gives a static variable to a function."""
    def decorate(func):
        """Pfft."""
        setattr(func, varname, value)
        return func
    return decorate


def append(filename, msg):
    """Appends msg to file."""
    with file(filename, 'a') as fh:
        fh.write(msg + "\n")


def call_binary(binary, args, **kwargs):
    """Calls binary with given args. Returns (rc, out) tuple."""
    pb_bin = plumbum.local[binary]

    cwd = plumbum.local.cwd.getpath()
    if "_cwd" in kwargs:
        cwd = kwargs["_cwd"]

    rc = 0
    res = None
    with plumbum.local.cwd(cwd):
        start = time.time()
        try:
            if "_out" in kwargs:
                res = (pb_bin[args] >> kwargs["_out"])()
            else:
                res = pb_bin(args)
        except plumbum.ProcessExecutionError as err:
            end = time.time()
            rc = err.retcode
            res = err.stdout

            if not kwargs.get("_silence_err", False):
                twlog.publish(CHANNEL_PUBLISH_STDERR, err.stderr.strip())

            twlog.publish(CHANNEL_FUNCTION_CALL_FAIL,
                          "{} {} {}".format(rc, binary, " ".join(args)))
        else:
            end = time.time()

        if PUBLISH_TIMINGS:
            twlog.publish(CHANNEL_FUNCTION_TIMINGS,
                          "{:.2f} {}".format(end - start, binary))

    return (rc, res)


@contextlib.contextmanager
def temp_wd(new_wd):
    orig_dir = os.getcwd()
    os.chdir(new_wd)
    try:
        yield
    finally:
        os.chdir(orig_dir)


def call_binary_sh(binary, args, **kwargs):
    """Calls binary with given args. Returns (rc, out) tuple."""
    import sh

    binary_callable = sh.Command(binary)
    cwd = kwargs.get("_cwd", os.getcwd())
    try:
        del kwargs['cwd']
    except KeyError:
        pass

    rc = 0
    with temp_wd(cwd):
        start = time.time()
        try:
            binary_callable(args, **kwargs)
        except sh.ErrorReturnCode as err:
            rc = err.exit_code
        finally:
            end = time.time()

        if PUBLISH_TIMINGS:
            twlog.publish(CHANNEL_FUNCTION_TIMINGS,
                          "{:.2f} {}".format(end - start, binary))
    return rc


def _convert_to_args(items):
    args = []
    for key, val in items.iteritems():
        # Javascript doesn't like "True".
        strval = str(val)
        if type(val) == bool:
            strval = strval.lower()
        args.append("--{}={}".format(key, strval))
    return args


class TripwireDB(object):  #pylint: disable=R0904

    def __init__(self, twlog_local):
        global twlog  # pylint: disable=W0603
        self._queries = TripwireQueries(DB)
        self._redis = redis.Redis()
        twlog = twlog_local

    def verify_iid(self, iid, msg=None):
        """Verifies that the provided iid is used, and if it isn't, dies."""
        if not self._queries.identities.verify_used_iid(iid):
            raise AbortException(
                "{}: IID not properly set to used {}".format(msg, iid))

    def get_proxy_args(self, id_type):  #pylint: disable=R0201
        """Returns proxy information for the phantomjs call."""
        if id_type not in _PROXY_MAP:
            raise AbortException("Unknown proxy for id type {}".format(id_type))
        return _PROXY_MAP[id_type]

    def free_identity_if_new(self, iid):
        """Frees identity if it's not used in a registration."""
        if self._queries.identities.is_iid_used_in_mapping(iid):
            return
        result = self._queries.identities.free_identity(iid)
        if result:
            twlog.publish(CHANNEL_ID_FREED, iid)
        return result

    def add_registration(self, did, vid, iid, registration_type):
        """Adds a registration with appropriate info, and publishes results."""
        rid = self._queries.registration.add_registration(
            did, vid, iid, registration_type)
        if not rid:
            raise AbortException("Reg. insertion fail: {} {} {} {}".format(
                did, vid, iid, registration_type))

        # We commit here so that it's definitely available when we publish
        self.commit()

        twlog.publish(CHANNEL_REG_SUCCEED, rid)
        return rid

    def add_status(self, did, vid, ret_status, iid, rid, sid, gid, qid,
                   checkpoint, last_status, queue):
        """Inserts a result into the status table."""
        self._queries.status.add_status(
            did, vid, ret_status, iid, rid, sid, gid, qid,
            checkpoint, last_status, queue)
        return True

    def assign_iid_to_did(self, did, iid, id_group, id_type):
        return self._queries.identities.assign_iid_to_did(
            did, iid, id_group, id_type)

    def assign_iid_to_did_if_needed(self, did, iid, id_group, id_type):
        if self._queries.identities.is_iid_used_in_mapping(iid):
            return
        return self.assign_iid_to_did(did, iid, id_group, id_type)

    def get_iid(self, id_group, id_type, did, gid):
        """Gets an iid for the given did/group/type. Uses old one if needed."""
        if re.search("[^a-zA-Z0-9_-]", id_group) is not None:
            raise AbortException("Group name contains invalid characters")

        if re.search("[^a-zA-Z0-9_-]", id_type) is not None:
            raise AbortException("Type name contains invalid characters")

        # If we already have one assigned, return it.
        iid = self._queries.identities.get_preexisting_iid(
            did, id_group, id_type)

        if iid:
            new = False
        else:
            # Otherwise try to get one...
            iid = self._queries.identities.get_brand_new_iid(
                id_group, id_type, gid)
            if not iid:
                raise AbortException("No available new iids of group/type")
            new = True
            # ...but DO NOT assign it (yet)

        self.commit()
        self.verify_iid(iid, "queue_sites")

        twlog.publish(CHANNEL_ID_USED,
                      "{}/{}".format(iid, "new" if new else "old"))

        return iid

    def get_conf_filename(self, iid, force=False):
        return self._queries.identities.get_conf_file(iid, force)

    def get_id_type(self, iid):
        return self._queries.identities.get_id_type(iid)

    def queue_site(self, did, vid, id_group, id_type, sid, queue,
                   alexa=None, retry_count=0):
        """Queues a site for processing."""
        qid = self._queries.queue.queue_site(
            did, vid, id_group, id_type, sid, queue, alexa, retry_count)
        return qid

    def claim_and_retrieve_job(self, queue, max_tries, gid=None):
        if not gid:
            gid = self.get_new_global_id()
        try:
            res = self._queries.queue.claim_and_retrieve_job(
                queue, max_tries, gid)

        except psycopg2.extensions.TransactionRollbackError:
            return self.claim_and_retrieve_job(queue, max_tries, gid)

        if res:
            res['gid'] = gid
            res['version'] = self.get_version_name_from_vid(res['vid'])
            res['url'] = self._queries.domains.get_domain_name_from_did(
                res['did'])

        return res

    def claim_job_by_qid(self, qid):
        res = self._queries.queue.claim_job_by_qid(qid)
        if res:
            res['gid'] = self.get_new_global_id()
            res['version'] = self.get_version_name_from_vid(res['vid'])
            res['url'] = self._queries.domains.get_domain_name_from_did(
                res['did'])

        return res

    def complete_job_by_qid(self, qid):
        return self._queries.queue.complete_job_by_qid(qid)

    def fail_job_by_qid(self, qid):
        return self._queries.queue.fail_job_by_qid(qid)

    def set_job_status_by_qid(self, qid, status):
        return self._queries.queue.set_job_status_by_qid(qid, status)

    def requeue(self, qid):
        """Requeus by qid."""
        return self._queries.queue.requeue(qid)

    def get_sid_from_name(self, strategy_name):
        """Converts name to sid."""
        return self._queries.strategies.get_sid_from_name(strategy_name)

    def get_strategy_args(self, sid):
        strategy = self._queries.strategies.get_strategy_argparts(sid)
        if not strategy:
            raise AbortException("Invalid strategy id: {}".format(sid))
        return _convert_to_args(strategy)

    def commit(self):
        self._queries.commit()

    def rollback(self):
        self._queries.rollback()

    def get_new_global_id(self):
        return self._redis.incr(GLOBAL_ID_KEY)

    def get_proxy_history(self):
        res = self._redis.get(PROXY_HEALTH_HISTORY_KEY)
        if not res:
            # If we don't have a key, something's bad. Fail hard.
            raise MissingProxyHistoryException(PROXY_HEALTH_HISTORY_KEY)
        return int(res)

    def get_vid_from_name(self, version):
        old_vid = self._queries.get_vid_from_version(version)
        if not old_vid:
            return self._queries.create_version(version)
        return old_vid

    def get_did_from_domain_name(self, version):
        return self._queries.domains.get_did_from_domain_name(version)

    def get_version_name_from_vid(self, vid):
        return self._queries.get_version_name_from_vid(vid)

    def get_error_name_from_no(self, errno):
        return self._queries.get_error_name_from_no(errno)

    def get_num_accounts_of_type(self, did, idtype, acceptable_statii=None):
        return self._queries.domains.get_num_accounts_of_type(
            did, idtype, acceptable_statii)


def get_terminal_size():
    # Stolen from "http://stackoverflow.com/questions/566746/"
    #             "how-to-get-console-window-width-in-python
    env = os.environ

    def ioctl_GWINSZ(fd):  #pylint: disable=C0103
        try:
            import fcntl
            import termios
            import struct
            cr = struct.unpack(
                'hh', fcntl.ioctl(fd, termios.TIOCGWINSZ, '1234'))
        except:  #pylint: disable=W0702
            return
        return cr

    cr = ioctl_GWINSZ(0) or ioctl_GWINSZ(1) or ioctl_GWINSZ(2)
    if not cr:
        try:
            fd = os.open(os.ctermid(), os.O_RDONLY)
            cr = ioctl_GWINSZ(fd)
            os.close(fd)
        except:  #pylint: disable=W0702
            pass

    if not cr:
        cr = (env.get('LINES', 25), env.get('COLUMNS', 80))

    return int(cr[1]), int(cr[0])
