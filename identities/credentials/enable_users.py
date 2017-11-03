#!/usr/bin/python

import psycopg2
import psycopg2.extras
import sys

################################################################################

DB_NAME     =  # BLANKED
DB_USER     =  # BLANKED
DB_HOST     =  # BLANKED
DB_PASS     =  # BLANKED

DB_TABLE    = 'identities'


def main():
    conn = psycopg2.connect(dbname=DB_NAME, user=DB_USER,
                            host=DB_HOST, password=DB_PASS)
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    if len(sys.argv) != 2:
        sys.stderr.write("Wrong number of arguments!\n")
        sys.exit(1)

    infile = open(sys.argv[1])

    for i, username in enumerate(infile):
        username = username.strip()

        query = "UPDATE " + DB_TABLE + " SET " + \
                "\"enabled\" = true" + \
                " WHERE" + \
                " lower(\"username\") = %(username)s"
        print i, username

        try:
            cur.execute(query, {'username': username})
            pass
        except Exception as e:
            sys.stderr.write(
                "Caught exception: {} while executing on user {}\n".format(
                    e, username))
            conn.rollback()
            sys.exit(1)

        if cur.rowcount != 1:
            sys.stderr.write(
                "Error: Wrong rowcount: {} {}".format(username, cur.rowcount))
            sys.exit(1)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    sys.exit(main())
