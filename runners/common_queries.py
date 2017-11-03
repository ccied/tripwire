"""The QueueQueries object gives you a nice way to use the database."""

import sys
import psycopg2

from get_conf_file import get_conf_file as _raw_get_conf_file


def _has_data(cur):
    """Returns whether or not the cursor has at least some data."""
    row = cur.fetchone()
    if row:
        return True
    return False


class QueryException(Exception):
    """Buncha things raise this to indicate that we need to die."""
    pass


class QueueQueries(object):
    """Queries relating only to the queue."""
    def __init__(self, conn, cur, queries):
        self.conn = conn
        self.cur = cur
        self.queries = queries

    def queue_site(self, did, vid, id_group,
                   id_type, sid, queue='default', alexa=None, retry_count=0):
        insert_query = ('INSERT INTO queues '
                        '   ("did", "vid", "try", "sid", "id_group", "id_type",'
                        '    "queue", "alexa")'
                        ' VALUES (%s, %s, %s, %s, %s, %s, %s, %s)'
                        ' RETURNING "qid"')
        self.cur.execute(insert_query,
                         [did, vid, retry_count,
                          sid, id_group, id_type, queue, alexa])
        row = self.cur.fetchone()
        return row['qid']

    def claim_and_retrieve_job(self, queue, max_tries, gid):
        """Pulls out a new iid. No checking about whether it's needed or not."""
        query = ("UPDATE queues SET status = 'running', claimed_by = %s"
                 " WHERE qid IN"
                 " (SELECT qid FROM queues WHERE queue = %s"
                 " AND status = 'queued'"
                 " AND try < %s ORDER BY qid ASC LIMIT 1 FOR UPDATE)"
                 " AND qid NOT IN"
                 " (SELECT qid FROM queues WHERE status = 'running' FOR UPDATE)"
                 " RETURNING *")
        self.cur.execute(query, (gid, queue, max_tries))
        result = self.cur.fetchone()
        if result:
            return dict(result)
        return None

    def requeue(self, qid):
        """Requeues given qid, incrementing "try" as needed."""
        query = ("UPDATE queues SET status = 'queued', claimed_by = null, "
                 "try = try + 1 WHERE qid = %s")
        self.cur.execute(query, (qid,))
        return self.cur.rowcount == 1

    def claim_job_by_qid(self, qid):
        """Pulls out an entry from the queue by its id."""
        query = ("UPDATE queues SET status = 'running' WHERE qid = %s"
                 " RETURNING *")
        self.cur.execute(query, (qid,))
        result = self.cur.fetchone()
        if result:
            return dict(result)
        return None

    def complete_job_by_qid(self, qid):
        """Finishes out an entry from the queue by its id."""
        query = ("UPDATE queues SET status = 'completed', claimed_by = null, "
                 "try = try + 1 WHERE qid = %s")
        self.cur.execute(query, (qid,))
        return self.cur.rowcount == 1

    def disable_job_by_qid(self, qid):
        """Disables a job by qid."""
        query = ("UPDATE queues SET status = 'disabled', claimed_by = null, "
                 "try = try + 1 WHERE qid = %s")
        self.cur.execute(query, (qid,))
        return self.cur.rowcount == 1

    def fail_job_by_qid(self, qid):
        """Disables a job by qid."""
        query = ("UPDATE queues SET status = 'failed', claimed_by = null, "
                 "try = try + 1 WHERE qid = %s")
        self.cur.execute(query, (qid,))
        return self.cur.rowcount == 1

    def set_job_status_by_qid(self, qid, status):
        """Gives the queue entry the given status and advances the try count."""
        query = ("UPDATE queues SET status = %s, try = try + 1"
                 " WHERE qid = %s")
        self.cur.execute(query, (status, qid))
        return self.cur.rowcount == 1

    def release_job_by_qid(self, qid):
        """Backs out of trying this queue item."""
        query = ("UPDATE queues SET status = 'queued', claimed_by = null "
                 " WHERE qid = %s")
        self.cur.execute(query, (qid,))
        return self.cur.rowcount == 1


class StatusQueries(object):
    """Queries relating only to the status and queue_decision_log tables."""
    # TODO: It makes no sense that queue_decision_log stuff would be here, but
    # the entire thing's a fucking nightmare, so hey.
    def __init__(self, conn, cur, queries):
        self.conn = conn
        self.cur = cur
        self.queries = queries

    def add_status(self, did, vid, errno, iid, rid, sid, gid, qid,
                   checkpoint, last_status, queue):
        """Inserts result into status table."""
        query = ("INSERT INTO status"
                 " (did, vid, errno, iid, rid, sid, gid, qid,"
                 " checkpoint, last_status, queue) VALUES"
                 " (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)")
        self.cur.execute(query,
                         [did, vid, errno, iid, rid, sid, gid, qid,
                             checkpoint, last_status, queue])

    def log_decision(self, did, alexa, queue, sid, id_type, id_group, vid, qid,
                     decision, pid):
        """Inserts entry into queue_decision_log table."""
        query = ("INSERT INTO queue_decision_log"
                 " (did, alexa, queue, sid, id_type, id_group, vid, qid,"
                 "  decision, pid) VALUES"
                 " (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)")
        self.cur.execute(query,
                         [did, alexa, queue, sid, id_type, id_group, vid, qid,
                          decision, pid])


class RegistrationQueries(object):
    """Queries relating only to the registration table."""
    def __init__(self, conn, cur, queries):
        self.conn = conn
        self.cur = cur
        self.queries = queries

    def add_registration(self, did, vid, iid, registration_type):
        """Adds the registration with the given info."""
        update_query = 'UPDATE identities SET "in_use" = true where iid = %s'
        insert_query = ('INSERT INTO registrations (did, vid, iid, status)'
                        'VALUES (%s, %s, %s, %s) RETURNING "rid"')
        self.cur.execute(update_query, [iid])
        self.cur.execute(insert_query, [did, vid, iid, registration_type])

        row = self.cur.fetchone()
        rid = row['rid']
        return rid

    def is_iid_used_in_registration(self, iid):
        """Returns whether iid is used in a registration."""
        query = "SELECT iid FROM registrations WHERE iid = %s"
        self.cur.execute(query, [iid])
        return self.cur.rowcount >= 1


class IdentityQueries(object):
    """Queries relating only to the identities table."""
    def __init__(self, conn, cur, queries):
        self.conn = conn
        self.cur = cur
        self.queries = queries

    def is_iid_used_in_mapping(self, iid):
        """Returns whether iid is used in a registration."""
        query = "SELECT iid FROM url_id_assignments WHERE iid = %s"
        self.cur.execute(query, [iid])
        return _has_data(self.cur)

    def verify_used_iid(self, iid):
        """Returns if the ID is marked as 'used' and is otherwise legit."""
        query = ('SELECT iid FROM identities WHERE "iid" = %s'
                 ' AND "used" AND "enabled" and "verified"')
        self.cur.execute(query, [iid])
        return _has_data(self.cur)

    def drop_iid_from_did_mapping(self, iid):
        """Deletes the identity from the identity-URL mapping. NO CHECKS."""
        delete_query = "DELETE FROM url_id_assignments WHERE iid = %s"
        self.cur.execute(delete_query, [iid])

    def get_id_type(self, iid):
        """Returns the id type of a given iid."""
        query = 'SELECT "type" FROM identities WHERE iid = %s'
        self.cur.execute(query, [iid])
        row = self.cur.fetchone()
        if not row:
            return None
        return row['type']

    def _release_identity(self, iid):
        """Releases identity from in identity table (leaves registrations)."""
        update_query = ('UPDATE identities SET "used" = false,'
                        ' "in_use" = false, "in_use_by" = null'
                        ' WHERE "used" and iid = %s')

        # Do the actual update
        self.cur.execute(update_query, [iid])

        if self.cur.rowcount != 1:
            raise QueryException(
                "Identity not correctly updated: {}!".format(self.cur.rowcount))

    def free_identity(self, iid):
        """Frees identity if it's not used in a registration."""
        if self.queries.registration.is_iid_used_in_registration(iid):
            return False

        self.drop_iid_from_did_mapping(iid)
        self._release_identity(iid)
        return True

    def get_preexisting_iid(self, did, groupname, typename):
        """Returns if there's a preexisting iid for the given did situation."""
        query = ("SELECT iid FROM url_id_assignments WHERE did = %s AND "
                 "batch = %s AND type = %s")
        self.cur.execute(query, (did, groupname, typename))
        row = self.cur.fetchone()
        if not row:
            return None
        return row['iid']

    def get_brand_new_iid(self, groupname, typename, gid):
        """Pulls out a new iid. No checking about whether it's needed or not."""
        query = ('UPDATE identities SET used = true, in_use_by = %s '
                 ' WHERE iid IN'
                 ' (SELECT iid FROM identities WHERE'
                 ' "group" = %s AND "type" = %s'
                 ' AND enabled AND NOT used AND verified AND NOT in_use'
                 ' ORDER BY iid ASC LIMIT 1 FOR UPDATE) and'
                 ' iid NOT IN (SELECT iid from '
                 ' url_id_assignments) RETURNING iid')
        self.cur.execute(query, (gid, groupname, typename))
        row = self.cur.fetchone()
        if not row:
            return None
        iid = row['iid']
        return iid

    def assign_iid_to_did(self, did, iid, groupname, typename):
        """Force a mapping between iid and the did. No checking."""
        update_query = 'UPDATE identities SET "in_use" = true WHERE iid = %s'
        query = ("INSERT INTO url_id_assignments (iid, batch, type, did) VALUES"
                 " (%s, %s, %s, %s)")
        self.cur.execute(update_query, (iid,))
        self.cur.execute(query, (iid, groupname, typename, did))

    def get_conf_file(self, iid, force=False):
        return _raw_get_conf_file(self.cur, iid, force)


class DomainQueries(object):
    """Queries relating only to the domain table."""
    # TODO TODO TODO
    def __init__(self, conn, cur, queries):
        self.conn = conn
        self.cur = cur
        self.queries = queries

    def _get_prexisting_did_from_domain_name(self, domain_name):
        query = ("SELECT did FROM domains WHERE domain_name = %s")
        self.cur.execute(query, (domain_name,))
        row = self.cur.fetchone()
        return row['did'] if row else None

    def get_did_from_domain_name(self, domain_name):
        old_did = self._get_prexisting_did_from_domain_name(domain_name)
        if old_did is not None:
            return old_did

        insert_query = ('INSERT INTO domains (domain_name) VALUES (%s)'
                        ' RETURNING "did"')
        self.cur.execute(insert_query, (domain_name,))
        row = self.cur.fetchone()
        return row['did']

    def get_domain_name_from_did(self, did):
        query = ("SELECT domain_name FROM domains WHERE did = %s")
        self.cur.execute(query, (did,))
        row = self.cur.fetchone()
        return row['domain_name'] if row else None

    def get_num_accounts_of_type(self, did, idtype, acceptable_statii=None):
        if not acceptable_statii:
            acceptable_statii = ['confirmed', 'email-clicked', 'email-recevied']

        query = ("SELECT count(*) AS n_accounts FROM registration_status WHERE"
                 " type = %s"
                 " AND did = %s"
                 " AND CAST (%s AS varchar[]) && statii")

        self.cur.execute(query, (idtype, did, acceptable_statii))
        row = self.cur.fetchone()

        # Though note that a none in this case in an error. Should return 0.
        return row['n_accounts'] if row else None


class StrategyQueries(object):
    """Queries relating only to the strategies table."""
    def __init__(self, conn, cur, queries):
        self.conn = conn
        self.cur = cur
        self.queries = queries

    def get_sid_from_name(self, strategy_name):
        query = ("SELECT sid FROM strategies WHERE name = %s")
        self.cur.execute(query, (strategy_name,))
        row = self.cur.fetchone()
        if not row:
            return None
        return row['sid']

    def get_strategy(self, sid):
        query = ("SELECT * FROM strategies WHERE sid = %s")
        self.cur.execute(query, (sid,))
        row = self.cur.fetchone()
        if not row:
            return None
        return row

    def get_strategy_argparts(self, sid):
        query = ("SELECT finder_prompt_min_count, filler_auto_fill,"
                 " filler_prompt_repair, filler_captcha_fill,"
                 " submit FROM strategies WHERE sid = %s")
        self.cur.execute(query, (sid,))
        row = self.cur.fetchone()
        if not row:
            return None
        return row


class TripwireQueries(object):
    """A glob o' things you can query that share a database connection."""
    def __init__(self, db):
        self.conn = self.cur = None
        self._connect(db)
        self.queue = QueueQueries(self.conn, self.cur, self)
        self.registration = RegistrationQueries(self.conn, self.cur, self)
        self.status = StatusQueries(self.conn, self.cur, self)
        self.strategies = StrategyQueries(self.conn, self.cur, self)
        self.identities = IdentityQueries(self.conn, self.cur, self)
        self.domains = DomainQueries(self.conn, self.cur, self)

    def _connect(self, db):
        """Connects to DB."""
        # What if this fails?
        self.conn = psycopg2.connect(**db)    #pylint: disable=W0142
        self.cur = self.conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    def commit(self):
        """Commits any pending transaction."""
        self.conn.commit()

    def rollback(self):
        """Rolls back any pending transaction."""
        self.conn.rollback()

    # We should find a home for these homeless queries...
    def get_vid_from_version(self, name):
        query = ("SELECT vid FROM queue_versions WHERE description = %s")
        self.cur.execute(query, (name,))
        row = self.cur.fetchone()
        if not row:
            return None
        return row['vid']

    def create_version(self, name):
        insert_query = ('INSERT INTO queue_versions (description) VALUES (%s)'
                        ' RETURNING "vid"')
        self.cur.execute(insert_query, (name,))
        row = self.cur.fetchone()
        return row['vid']

    def get_version_name_from_vid(self, vid):
        query = ("SELECT description FROM queue_versions WHERE vid = %s")
        self.cur.execute(query, (vid,))
        row = self.cur.fetchone()
        if not row:
            return None
        return row['description']

    def get_error_name_from_no(self, errno):
        query = ("SELECT text_name FROM error_codes WHERE errno = %s")
        self.cur.execute(query, (errno,))
        row = self.cur.fetchone()
        if not row:
            return None
        return row['text_name']


def main():
    pass

if __name__ == "__main__":
    sys.exit(main())

