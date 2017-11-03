#!/usr/bin/python

import datetime

import os.path
import psycopg2
import psycopg2.extras

import string    # pylint: disable=W0402
import sys

DB_NAME         =  # BLANKED
DB_USER         =  # BLANKED
DB_HOST         =  # BLANKED
DB_PASS         =  # BLANKED
DB_TABLE        = 'identities'

FIELD           = "password"
GROUP           = "test"

BASE_DIR        = "/cesr/tw/identities/make_conf"

TEMPLATE_FILE   = BASE_DIR + "/conf_template.txt"
STATES_FILE     = BASE_DIR + "/states.txt"
MONTHS_FILE     = BASE_DIR + "/months.txt"

#DEST_BASE       = "/tmp/tw-conf-"
DEST_BASE       = "/cesr/tw/deployed/configs/tw-conf-"
DEST_SUF_LEN    = 10

# IMPORTANT: We're hard-coding this domain in here to make sure we don't fuck
#   it up in the future.
EMAIL_DOMAIN    =  # BLANKED


def read_pairs(filename):
    pairs = dict()
    with open(filename, 'r') as fp:
        for line in fp:
            parts = line.rstrip().split('\t')
            pairs[parts[0]] = parts[1]
            pairs[parts[1]] = parts[0]
    return pairs


def get_basic(val):
    return "[\"" + val + "\"]"


def get_username(val):
    return get_basic(val[:14])


def get_state(state, states):
    return "[\"" + states[state] + "\", \"" + state + "\"]"


def get_month(dob, months):
    if dob.month < 10:
        month = "0" + str(dob.month) + "\", \"" + str(dob.month)
    else:
        month = str(dob.month)
    return "[\"" + month + "\", \"" + months[str(dob.month)] + "\"]"


def get_day(dob):
    if dob.day < 10:
        day = "0" + str(dob.day) + "\", \"" + str(dob.day)
    else:
        day = str(dob.day)
    return "[\"" + day + "\"]"


def get_gender(gender):
    if gender == "male":
        return '["(^|[^e])male", "guy", "(^|[^o])man", "^m$"]'
    else:
        return '["female", "gal", "woman", "^f$"]'


def get_year(dob):
    year = str(dob.year)
    return "[\"" + year + "\", \"" + year[2:] + "\"]"


def get_areacode(phone):
    return "[\"" + phone[:3] + "\", \"(" + phone[:3] + ")\"]"


def get_phone(phone):
    start = "[\""
    sep = "\", \""
    end = "\"]"

    areacode = phone[:3]
    exchange = phone[3:6]
    last4 = phone[6:]  # last four digits
    last7 = phone[3:]  # all but area code

    dashed = areacode + "-" + exchange + "-" + last4
    paren_dashed = "(" + areacode + ") " + exchange + "-" + last4
    paren_space = "(" + areacode + ") " + last7
    seven_dash = exchange + "-" + last4

    return start + (dashed + sep +
                    paren_dashed + sep +
                    phone + sep +
                    paren_space + sep +
                    seven_dash + sep +
                    last7) + end


def get_dob(dob):
    return ("[\"" +
            dob.strftime("%m/%d/%Y") + "\", \"" +
            dob.strftime("%d/%m/%Y") + "\", \"" +
            dob.strftime("%m/%d/%y") + "\", \"" +
            dob.strftime("%d/%m/%y") + "\", \"" +
            dob.strftime("%m-%d-%Y") + "\", \"" +
            dob.strftime("%d-%m-%Y") + "\", \"" +
            dob.strftime("%m-%d-%y") + "\", \"" +
            dob.strftime("%d-%m-%y") + "\"]")


def get_zip(zipcode):
    if len(zipcode) > 5:
        return '["{}", "{}"]'.format(zipcode, zipcode[6:])
    return '["{}"]'.format(zipcode)


def get_age(dob):
    today = datetime.date.today()

    d = today - dob
    return '["%s"]' % str(int(d.days / 365.25))


def get_dict(row):
    states = read_pairs(STATES_FILE)
    months = read_pairs(MONTHS_FILE)

    return {"dob": get_dob(row['dob']),
            "month": get_month(row['dob'], months),
            "day": get_day(row['dob']),
            "year": get_year(row['dob']),
            "age": get_age(row['dob']),

            "address": get_basic(row['address']),
            "city": get_basic(row['city']),
            "state": get_state(row['state'], states),
            "zip": get_zip(row['zip']),

            "phone": get_phone(row['phone']),
            "areacode": get_areacode(row['phone']),

            "firstname": get_basic(row['firstname']),
            "lastname": get_basic(row['lastname']),
            "middleinitial": get_basic(row['middleinitial']),
            "fullname": get_basic(row['firstname'] + " " + row['lastname']),

            "username": get_username(row['username']),
            "password": get_basic(row['password']),

            "email": get_basic(row['username'] + "@" + EMAIL_DOMAIN),

            "sex": get_gender(row['gender']),

            "iid": row['iid'],
            }


def usage():
    sys.stderr.write("Usage: " + sys.argv[0] + " IID [force?]\n")


def get_dest(iid, username):
    return "{}{}-{}".format(DEST_BASE, iid, username)


def get_conf_file(cur, iid, force=False):
    with open(TEMPLATE_FILE, 'r') as fp:
        contents = fp.read()

    template = string.Template(contents)

    cur.execute("SELECT * FROM identities WHERE iid = %s", [iid])
    row = cur.fetchone()

    if not row:
        sys.stderr.write("ERROR: Unable to find IID\n")
        return None

    config_data = template.substitute(get_dict(row))
    username = row['username']

    dest = get_dest(iid, username)

    if force or not os.path.exists(dest + ".js"):
        with open(dest + ".js", 'w') as f:
            f.write(config_data)

    return dest


def main():
    if len(sys.argv) < 2 or len(sys.argv) > 3:
        usage()
        return 1

    try:
        iid = int(sys.argv[1])
    except ValueError:
        sys.stderr.write("ERROR: IIDs are integers\n")
        return 1
    force = len(sys.argv) == 3

    conn = psycopg2.connect(dbname=DB_NAME, user=DB_USER,
                            host=DB_HOST, password=DB_PASS)
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    print get_conf_file(cur, iid, force)

    conn.close()

    return 0


if __name__ == "__main__":
    sys.exit(main())
