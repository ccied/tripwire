#!/usr/bin/python
"""Handles incoming emails and stuff."""
import datetime

import email
import email.parser
import email.message
import email.header
import gzip
import logging
import os.path
import re
import stat
import sys

import psycopg2
import psycopg2.extras

import subprocess
import redis
#import threading

import traceback


DB_NAME = ""  # BLANKED
# DB_NAME     = ""  # BLANKED
DB_USER = ""  # BLANKED
DB_HOST = ""  # BLANKED
DB_PASS = ""  # BLANKED

MESSAGE_FOLDER = "/tw/messages/by-username"

CHECK_DELAY = "60 SECONDS"

PATH_TO_PAGEGRAB = "/cesr/tw/mail/bin/pagegrab"

MIN_URL_WEIGHT = 0

# How long to let the urlsnap run (SIG_TERM)
TIMEOUT_TERM = "5m"
# How long to let the urlsnap run (SIG_KILL)
TIMEOUT_KILL = "5.1m"


OUTDIR_PERMISSIONS = 0771 | stat.S_ISGID
ADDRESS_PATTERN = re.compile(".*<(.*@.*)>$")

# Just FYI:
# define EX_OK           0       /* successful termination */
# define EX__BASE        64      /* base value for error messages */
# define EX_USAGE        64      /* command line usage error */
# define EX_DATAERR      65      /* data format error */
# define EX_NOINPUT      66      /* cannot open input */
# define EX_NOUSER       67      /* addressee unknown */
# define EX_NOHOST       68      /* host name unknown */
# define EX_UNAVAILABLE  69      /* service unavailable */
# define EX_SOFTWARE     70      /* internal software error */
# define EX_OSERR        71      /* system error (e.g., can't fork) */
# define EX_OSFILE       72      /* critical OS file missing */
# define EX_CANTCREAT    73      /* can't create (user) output file */
# define EX_IOERR        74      /* input/output error */
# define EX_TEMPFAIL     75      /* temp failure; user is invited to retry */
# define EX_PROTOCOL     76      /* remote error in protocol */
# define EX_NOPERM       77      /* permission denied */
# define EX_CONFIG       78      /* configuration error */

# define EX__MAX 78      /* maximum listed value */


def ensure_created(outdir):
    if not os.path.isdir(outdir):
        os.makedirs(outdir, OUTDIR_PERMISSIONS)


def backup_message(msg, un):
    if not un:
        un = "__MISSING__"

    lower_username = un.lower()
    outdir = os.path.join(MESSAGE_FOLDER, lower_username[0], lower_username)
    ensure_created(outdir)

    stamp = datetime.datetime.today().strftime("%y%m%d-%H%M%S-%f")
    fn = "{}-{}.eml.gz".format(stamp, un)

    outpath = os.path.join(outdir, fn)

    try:
        with gzip.open(outpath, 'w') as f:
            f.write(msg)
    except IOError:
        outpath = os.path.join("/tmp/", fn)
        with gzip.open(outpath, 'w') as f:
            f.write(msg)
    return outpath


def snap_url(url, rid):
    args = ["timeout", "-k",
            TIMEOUT_KILL, TIMEOUT_TERM,
            PATH_TO_PAGEGRAB, url, str(rid)]
    try:
        ret = subprocess.check_output(args)
        return (0, ret.rstrip())
    except subprocess.CalledProcessError as e:
        return (e.returncode, e.output.rstrip())


def extract_to(message):
    # if 'x-original-to' in message:
    #    to_addr = message['x-original-to']
    # if 'delivered-to' in message:
    #    to_addr = message['delivered-to']
    if ('to' in message and
            "undisclosed recipients" not in message['to'].lower()):
        to_addr = message['to']
    elif 'x-original-to' in message:
        to_addr = message['x-original-to']
    elif 'delivered-to' in message:
        to_addr = message['delivered-to']
    else:
        return None

    # Look for and strip out the "John Smith <jsmith@foo.com>" Pattern.
    match = ADDRESS_PATTERN.match(to_addr)
    if match:
        return match.group(1)

    return to_addr


def decode_subject(message):
    subject = message['subject']
    subject = re.sub(r"=\n\s*", "", subject)  # .replace("=\n ", "")
    # Work around invalid
    # subject = re.sub(r"(=\?.*\?=)(?!$)", r"\1 ", subject)
    try:
        parts = email.header.decode_header(subject)
    except email.header.HeaderParseError:
        # If parsing fails, lets just try utf-8, which will work fine for
        # ASCII anyway.
        parts = [(subject, 'utf-8')]
    return parts


class MailHandler(object):
    URL_PATTERN = (r"(?<!(src)=(\"|'))(https?://([a-z0-9.-]+)/"
                   r"([a-z0-9./?!@#$%^&*_=+-;:]+)(?<!\.(gif|jpg|png)))"
                   r"(\s|$|\"|'|<)")  # Case-insensitive only!
    MESSAGE_TABLE = "messages"
    REGISTRATION_TABLE = "registrations"
    IDENTITY_TABLE = "identities"
    MESSAGE_QUEUE_TABLE = "unprocessed_messages"
    URL_ID_MAP_TABLE = "url_id_assignments"
    QUEUE_TABLE = "queues"

    DEQUEUE_LIMIT = 10

    # REG_INTERVAL = "2 days"
    REG_INTERVAL = "10 days"

    LOG_CHANNEL_PREFIX = "tw:log:mailhandler:"

    DOMAIN_BLACKLIST = [
        r"w3\.org",
        r"facebook\.com",
        r"linkedin\.com",
        r"twitter\.com",
        r"youtube\.com",
        r"schema\.org",
        r"google\.com",
    ]

    #URL_BONUSES = [
    #    (r"confirm", 200),
    #    (r"verify", 200),
    #]

    URL_BONUSES = [
        (r"confirm", 200),
        (r"verify", 200),
        (r"activate", 200),
        (r"validate", 100),
        (r"account", 30),
        (r"signup", 20),
        (r"setup", 20),
        (r"subscribe", 80),
        (r"delete", -100),
        (r"unsubscribe", -200),
        (r"spam", -200),
        (r"close", -100),
        (r"account/?$", -35),
    ]

    REPEAT_BONUS = 20

    KILL_PATTERNS = []

    SUBJECT_PATTERNS = [r"activate",
                        r"confirm",
                        r"verif",
                        r"regist",
                        r"account",
                        r"complete",
                        r"join",
                        r"setup",
                        r"welcome"]
    PATH_OFFSET = 20
    MAX_PATH_BONUS = 60
    MIN_PATH_LENGTH = 9

    database = None

    def __init__(self, dbname, dbuser, dbpass, dbhost='localhost'):
        self.database = {
            "name": dbname, "user": dbuser, "pass": dbpass, "host": dbhost}

        if not self.__try_connect():
            self.log("warning", "CONNECTION TO DB FAILED")

    def __del__(self):
        if self.__is_connected():
            self.database["conn"].close()

    def __is_connected(self):
        return "conn" in self.database and self.database["conn"] is not None

    def __try_connect(self):
        self.redis = redis.Redis()

        database = self.database
        try:
            database["conn"] = psycopg2.connect(
                dbname=database["name"],
                user=database["user"],
                host=database["host"],
                password=database["pass"]
            )
            self.cur = database["conn"].cursor(
                cursor_factory=psycopg2.extras.DictCursor)
        except psycopg2.OperationalError:
            return False

        return True

    def __get_iid(self, to):
        try:
            username = re.search("([a-zA-Z0-9]+)@.*", to).group(1)
        except AttributeError:
            self.log("error", "Unable to extract username from " + to)
            return None

        database = self.cur
        command = ("SELECT iid FROM {id_table} WHERE"
                   " lower(username) = lower(%s)").format(
                       id_table=self.IDENTITY_TABLE)
        database.execute(database.mogrify(command, [username]))

        if not database.rowcount:
            return None

        try:
            row = database.fetchone()
        except psycopg2.ProgrammingError:
            return None

        if row:
            return row['iid']
        return None

    def __get_rid(self, to):
        try:
            username = re.search("([a-zA-Z0-9]+)@.*", to).group(1)
        except AttributeError:
            self.log("error", "Unable to extract username from " + to)
            return None

        database = self.cur
        command = ("SELECT rid FROM {reg_table} JOIN {id_table} ON "
                   " {reg_table}.iid = {id_table}.iid WHERE"
                   "    lower(username) = lower(%s) "
                   "    AND status != 'manual'"
                   "    AND regtime > now() - interval"
                   " '{interval}' ORDER BY regtime DESC LIMIT 1".format(
                       reg_table=self.REGISTRATION_TABLE,
                       id_table=self.IDENTITY_TABLE,
                       interval=self.REG_INTERVAL))
        database.execute(database.mogrify(command, [username]))

        if not database.rowcount:
            return None

        try:
            row = database.fetchone()
        except psycopg2.ProgrammingError:
            return None

        if row:
            return row['rid']
        return None

    def __get_payload(self, msg):
        (_, payload) = self.__get_weight_payload(msg)
        return payload

    def __get_weight_payload(self, msg):
        weight = 100
        payload = ""
        ct = msg.get_content_type()
        # print ct
        if ct == "text/plain":
            payload = msg.get_payload(decode=True)
            weight = 1
        elif ct == "text/html":
            payload = msg.get_payload(decode=True)
            weight = 5
        elif msg.is_multipart():
            best = 100
            for part in msg.get_payload():
                (mw, mp) = self.__get_weight_payload(part)
                if mw < best:
                    weight = mw
                    payload = mp
        else:
            pass  # raise Exception("Unknown content type")
        return (weight, payload)

    def log(self, level, message):
        self.redis.publish(self.LOG_CHANNEL_PREFIX + level, message)

    def __has_interesting_subject(self, subject_parts):
        for part in subject_parts:
            subject = part[0]
            enctype = part[1]

            if enctype == '?':
                enctype = 'utf-8'

            if enctype is not None:
                subject = subject.decode(enctype, 'replace')
            for pattern in self.KILL_PATTERNS:
                if re.search(
                        pattern, subject, flags=re.IGNORECASE) is not None:
                    return False
            for pattern in self.SUBJECT_PATTERNS:
                if re.search(
                        pattern, subject, flags=re.IGNORECASE) is not None:
                    return True

        return False

    # def __get_reg_email_rid(self, message, to_addr):
        # Do this second, since payload is so much bigger...
        # if not passSubject:
        #    payload = getPayload(message).replace('\r', '')
        #    for pattern in self.SUBJECT_PATTERNS:
        #        if re.search(pattern, payload, flags=re.IGNORECASE) != None:
        #            passSubject = True
        #            break

        # sys.stderr.write(
        #   enctype if enctype != None else "None" + ":" + subject + "\n")
        # return passSubject

    @staticmethod
    def __len_compare(a, b):
        v = b['weight'] - a['weight']
        # if v == 0:
        #    return a['tb'] - b['tb']
        return v

    def __get_url_list(self, payload):
        expr = re.compile(self.URL_PATTERN, flags=re.IGNORECASE)

        # print payload
        # print "========"

        url_check = dict()

        urls = []
        # i = 0
        for match in expr.findall(payload):
            # print match
            url = match[2]
            domain = match[3]
            url_path = match[4]

            weight = min(
                max(len(url_path) - self.PATH_OFFSET,
                    0),
                self.MAX_PATH_BONUS)

            if len(url_path) < self.MIN_PATH_LENGTH:
                weight -= 100000
                logging.info(" - Ignoring %s because of it being too short",
                             url_path)

            for bl_item in self.DOMAIN_BLACKLIST:
                if re.search(
                        bl_item, domain, flags=re.IGNORECASE) is not None:
                    weight -= 100000
                    logging.info(
                        " - Ignoring %s because of %s", url, bl_item)

            for bonus in self.URL_BONUSES:
                if re.search(
                        bonus[0], url_path, flags=re.IGNORECASE) is not None:
                    weight += bonus[1]
                    logging.info(" - Found %s (%d) in %s",
                                 bonus[0], bonus[1], url)

            if url in url_check:
                logging.info("Found repeat url: %s", url)
                urls[url_check[url]]["weight"] += self.REPEAT_BONUS
                continue

            logging.info("Found URL with weight %s: %s", weight, url)
            urls.append({"url": url, "weight": weight})  # , "tb": i})
            url_check[url] = len(urls) - 1
            # i+=1

        urls.sort(MailHandler.__len_compare)
        return urls

    def commit(self):
        self.database["conn"].commit()

    def register_message_status(self, rid, status):
        try:
            self.cur.execute("UPDATE " + self.REGISTRATION_TABLE +
                             " SET \"status\" = %s WHERE " +
                             "\"rid\" = %s", [status, rid])
            self.database["conn"].commit()
        except TypeError as e:
            self.log("error", "UPDATE REG TABLE FAILED (TE): %s" % repr(e))
            self.log("error",
                     "... was trying to indicate received to %s" % rid)
            sys.exit(0)
        except psycopg2.IntegrityError as e:
            self.log("error", "UPDATE REG TABLE FAILED (TE): %s" % repr(e))
            self.log("error",
                     "... was trying to indicate received to %s" % rid)
            sys.exit(0)

    def register_message_clicked(
            self, rid, clicklink, path, errno, message_path=None):
        try:
            self.cur.execute(("INSERT INTO " + self.MESSAGE_TABLE +
                              " (rid, clicklink, path, errno, message_path)"
                              " VALUES (%s, %s, %s, %s, %s)"),
                             [rid, clicklink, path, errno, message_path])
            if errno == 0:
                self.register_message_status(rid, 'email-clicked')
            else:
                self.register_message_status(rid, 'email-click-failed')

            self.database["conn"].commit()
        except TypeError as e:
            self.log("error", "INSERT TO MSG TABLE FAILED (TE): %s" % repr(e))
            self.log("error", "... was trying to insert %s" % path)
            sys.exit(0)
        except psycopg2.IntegrityError as e:
            self.log("error", "INSERT TO MSG TABLE FAILED (IE): %s" % repr(e))
            self.log("error", "... was trying to insert %s" % path)
            sys.exit(0)

    def get_up_from_rid(self, rid):
        query = ("SELECT username, password FROM " +
                 self.IDENTITY_TABLE + " WHERE iid = " +
                 "(SELECT iid FROM " + self.REGISTRATION_TABLE +
                 " WHERE rid = %s)")
        rows = self._wrap_query(query, [rid])
        if rows:
            return (rows[0]['username'], rows[0]['password'])

        self.log("error", "Retrieved no un/pw for rid {}".format(rid))
        return (None, None)

    def get_up_from_iid(self, iid):
        query = ("SELECT username, password FROM " +
                 self.IDENTITY_TABLE + " WHERE iid = %s")
        rows = self._wrap_query(query, [iid])
        if rows:
            return (rows[0]['username'], rows[0]['password'])
        return (None, None)

    def get_password(self, username):
        query = ("SELECT password FROM " + self.IDENTITY_TABLE +
                 " WHERE lower(username) = lower(%s)")
        rows = self._wrap_query(query, [username])
        if rows:
            return rows[0]['password']
        return None

    def accept_mail(self, text, backup=True, user=None, message_path=None):
            # pylint: disable=too-many-locals
        message = email.message_from_string(text)

        to_addr = extract_to(message)
        self.log("debug", "user={}, to={}".format(user, to_addr))
        if to_addr is None:
            self.log("warning", "Message to unknown recipient")
            return 1

        name_match = re.search("([^<@]+)@.*", to_addr)
        to_name = name_match.group(1) if name_match is not None else ""

        subject_parts = decode_subject(message)
        subject = subject_parts[0][0]
        short_subject = (
            subject if len(subject) < 20 else (subject[:17] + "..."))

        if backup and not message_path:
            backup_path = backup_message(text, to_name)
            self.log("info", "Received message to {} ({}) saved at {}".format(
                to_name, short_subject, backup_path))
            if backup_path.startswith("/tmp"):
                self.log("error",
                         "PID {} Saved message to {}".format(
                             os.getpid(), backup_path))
                self.log("warning", ",".join(str(x) for x in os.getgroups()))
        else:
            self.log(
                "info",
                "Received message to {} ({}) to be stored at at {}".format(
                    to_name, short_subject,
                    message_path if message_path else "UNKNOWN"))

        if not self.__is_connected():
            self.log("error", "DB FAILURE: Can't process mail to " + to_name)
            return 1

        rid = self.__get_rid(to_addr)
        if rid is None:
            self.log("debug",
                     "No registration found in last {} for {}".format(
                         self.REG_INTERVAL,
                         to_addr))
            return 0

        if not self.__has_interesting_subject(subject_parts):
            self.log("debug",
                     "Msg to %s wasn't interesting (\"%s\")" %
                     (to_name, short_subject))
            return 0

        #logging.info("    Email to: %s", to_name)
        #logging.info("    RID: %d", rid)
        #logging.info("    Subject: %s", message['subject'])

        self.log("info", "Registration message received to " + to_name)
        self.log("info", "RID: " + str(rid))
        self.log("info", "Message subject: " + subject)

        payload = self.__get_payload(
            message).replace('\r', '').replace('=\n', '')

        urls = self.__get_url_list(payload)

        if len(urls) == 0 or urls[0]['weight'] < MIN_URL_WEIGHT:
            logging.info("Found no interesting links")
            self.log(
                "info",
                "Message had no interesting links: " + message['subject'])
            self.register_message_status(rid, 'email-received')
            return 0

        url = urls[0]["url"]

        logging.info("Chose URL %s", url)

        self.click_url(rid, url, message_path)

    def click_url(self, rid, url, message_path):
        errno, path = snap_url(url, rid)
        logging.info("Snap completed with errno %d, path %s", errno, path)

        if errno == 124:
            self.log("warning",
                     ("Link click failed ({}) on email for rid {}."
                      "URL {} gave {}").format(
                          errno, rid, url, path.strip()))
        elif errno != 0:
            self.log("error",
                     ("Link click failed ({}) on email for rid {}."
                      "URL {} gave {}").format(
                          errno, rid, url, path.strip()))
        else:
            self.log("info",
                     "Clicked on email for rid {}. URL {}; saved to {}".format(
                         rid, url, path.strip()))

        self.register_message_clicked(rid, url, path, errno, message_path)

        return 0

    def _get_recently_errored_clicks(self, interval, errnos=None):
        if not errnos:
            errnos = [1, 124]
        query = ("SELECT mid, rid, clicklink, message_path FROM "
                 + self.MESSAGE_TABLE +
                 " WHERE"
                 "  (NOT reclicked) AND"
                 "  ARRAY[errno] <@ %s AND"
                 "  clicktime > now() - interval %s")
        return self._wrap_query(query, [errnos, interval])

    def get_recent_clicks(self, criteria):
        query = ("SELECT mid, rid, clicklink, message_path FROM "
                 + self.MESSAGE_TABLE + " WHERE " + criteria)
        return self._wrap_query(query, [])

    def _wrap_query_noret(self, query, args):
        try:
            self.cur.execute(query, args)
        except TypeError as e:
            self.log("error", "Query failed (TE): %s" % repr(e))
            sys.exit(0)
        except psycopg2.IntegrityError as e:
            self.log("error", "Query failed (IE): %s" % repr(e))
            sys.exit(0)
        return None

    def _wrap_query(self, query, args):
        try:
            self.cur.execute(query, args)
            if self.cur.rowcount:
                return self.cur.fetchall()
        except TypeError as e:
            self.log("error", "Query failed (TE): %s" % repr(e))
            sys.exit(0)
        except psycopg2.IntegrityError as e:
            self.log("error", "Query failed (IE): %s" % repr(e))
            sys.exit(0)
        return None

    def set_message_as_not_recent(self, mid):
        query = "UPDATE messages SET reclicked = true WHERE mid = %s"
        self._wrap_query_noret(query, [mid])

    def retry_recent_error_clicks(self, interval, errnos, to_reprocess=None):
        if not to_reprocess:
            to_reprocess = self._get_recently_errored_clicks(interval, errnos)

        if not to_reprocess:
            print "Found none to reprocess"
            return

        print "Found", len(to_reprocess)

        for msg in to_reprocess:
            print "Trying to click", msg
            self.click_url(msg['rid'], msg['clicklink'], msg['message_path'])
            self.set_message_as_not_recent(msg['mid'])

    def queue_message(
            self, message, iid, backup_path, ignore_delay=CHECK_DELAY):
        database = self.cur
        command = ("INSERT INTO {table} "
                   " (message, iid, message_path, ignore_until) VALUES"
                   " (%s, %s, %s, now() + %s) RETURNING umid").format(
                       table=self.MESSAGE_QUEUE_TABLE)
        database.execute(command, (message, iid, backup_path, ignore_delay))

        try:
            return database.fetchone()['umid']
        except Exception as e:  # pylint:disable=broad-except
            self.log("error",
                     "Received " + str(e) + " in message queuing for " +
                     str(iid))
        return None

    def get_queued_messages(self):
        database = self.cur
        command = ("SELECT * FROM {message_queue_table} WHERE"
                   "    ignore_until <= now() AND"
                   "    NOT disabled AND"
                   "    iid NOT IN"
                   "        (SELECT iid FROM {url_id_map} WHERE did IN"
                   "            (SELECT did FROM {queue_table} WHERE"
                   "                status = 'running'))"
                   "    ORDER BY ignore_until DESC"
                   "    LIMIT {limit}").format(
                       message_queue_table=self.MESSAGE_QUEUE_TABLE,
                       url_id_map=self.URL_ID_MAP_TABLE,
                       queue_table=self.QUEUE_TABLE,
                       limit=self.DEQUEUE_LIMIT)
        database.execute(command)

        try:
            return database.fetchall()
        except Exception as e:  # pylint:disable=broad-except
            self.log("error",
                     "Received " + str(e) + " in retrieving queued messages")
        return None

    def requeue_message(self, umid, ignore_delay=CHECK_DELAY):
        database = self.cur
        command = ("UPDATE {table} SET"
                   "    process_attempt = process_attempt + 1,"
                   "    ignore_until = now() + %s,"
                   " WHERE umid = %s").format(table=self.MESSAGE_QUEUE_TABLE)
        database.execute(command, (ignore_delay, umid))

    def disabled_queued_message(self, umid):
        database = self.cur
        command = ("UPDATE {table} SET disabled = true"
                   " WHERE umid = %s").format(table=self.MESSAGE_QUEUE_TABLE)
        database.execute(command, [umid])

    def dequeue_message(self, umid):
        database = self.cur
        command = ("DELETE FROM {table} WHERE umid = %s").format(
            table=self.MESSAGE_QUEUE_TABLE)
        database.execute(command, [umid])

    def get_username_part(self, to_addr):
        try:
            return re.search("([a-zA-Z0-9]+)@.*", to_addr).group(1)
        except AttributeError:
            self.log("error", "Unable to extract username from " + to_addr)
        return None

    def accept_mail_to_queue(self, text):
        message = email.message_from_string(text)

        to_addr = extract_to(message)
        if not to_addr:
            backup_path = backup_message(text, "UNKNOWN")
            self.log(
                "error",
                "Received message to unknown recipient saved at {}".format(
                    backup_path))
            if backup_path.startswith("/tmp"):
                self.log("error",
                         "PID {} Saved message to {}".format(
                             os.getpid(), backup_path))
                self.log("warning", ",".join(str(x) for x in os.getgroups()))
            return None

        backup_path = backup_message(text, self.get_username_part(to_addr))
        self.log("info", "Received message to {} saved at {}".format(
            to_addr, backup_path))
        if backup_path.startswith("/tmp"):
            self.log("error",
                     "PID {} Saved message to {}".format(
                         os.getpid(), backup_path))
            self.log("warning", ",".join(str(x) for x in os.getgroups()))

        iid = self.__get_iid(to_addr)
        if not iid:
            self.log(
                "error",
                ("Received message to {}, an unknown identity recipient."
                 " Saved at {}.").format(to_addr, backup_path))
            return None

        umid = self.queue_message(text, iid, backup_path)
        self.commit()
        return (to_addr, iid, umid)


def get_handler():
    return MailHandler(DB_NAME, DB_USER, DB_PASS, DB_HOST)


def handle_mail(msg, user=None):
    mh = get_handler()
    mh.accept_mail(msg, user=user)


def main():
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s %(name)-12s %(levelname)-8s %(message)s',
        datefmt='%m-%d %H:%M')

    #timer = threading.Timer(CHECK_DELAY, handle_mail, args=[sys.stdin.read()])
    #timer.start()
    #timer.join()
    mh = get_handler()
    try:
        raw_message = sys.stdin.read()
        result = mh.accept_mail_to_queue(raw_message)
        if not result:
            return 0

        to, iid, umid = result  # pylint: disable=unpacking-non-sequence
        mh.log("info",
               "Queued msg to {}({}) as umid {}".format(to, iid, umid))
    except Exception as e:  # pylint: disable=broad-except
        mh.log("error",
               "While receiving mail, caught unknown exception {}".format(e))
        mh.log("warning", traceback.format_exc())

    return 0

if __name__ == "__main__":
    sys.exit(main())
