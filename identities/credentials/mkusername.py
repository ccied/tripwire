#!/usr/bin/python

import random
import string
import psycopg2
import psycopg2.extras
import sys
import hashlib

GROUP = "batch2"
TYPE  = "easy2"

# IDs ARE BOTH INCLUSIVE!
#ID_START    = 17501
#ID_END      = 20000
ID_START    = 237608
ID_END      = 250107

INFO = {
    "easy1": {
        "phone": "BLANKED",
        "strength": "weak",
        "domain": "@BLANKED",
    },
    "easy2": {
        "phone": "BLANKED",
        "strength": "weak",
        "domain": "@BLANKED",
    },
    "hard1": {
        "phone": "BLANKED",
        "strength": "strong",
        "domain": "@BLANKED",
    },
    "hard2": {
        "phone": "BLANKED",
        "strength": "strong",
        "domain": "@BLANKED",
    },
}


###############################################################################

PASSWORD_DICTIONARY_FILE = "words7"
ADJECTIVE_FILE = "adjective.txt"
NOUN_FILE = "non-adjective-nouns.txt"

TOTAL_WEAK_LENGTH   = 8
TOTAL_STRONG_LENGTH = 10

MAX_USERNAME_LEN = 15

DB_NAME     = ""  # BLANKED
DB_USER     = ""  # BLANKED
DB_HOST     = ""  # BLANKED
DB_PASS     = ""  # BLANKED

DB_TABLE    = 'identities'


def getWords(fn):
    with open(fn, 'r') as f:
        return f.read().split()


def getWeakPassword(words):
    word = random.choice(words)
    word = word.capitalize()

    numDigits = TOTAL_WEAK_LENGTH - len(word)

    digits = ''.join(random.choice(string.digits) for x in range(numDigits))
    return word + digits


def getStrongPassword():
    return ''.join(random.choice(string.ascii_letters + string.digits)
                   for x in range(TOTAL_STRONG_LENGTH))

#ALPHANUMERIC    = string.ascii_letters + string.digits
#UBER            = ALPHANUMERIC + "!@#$%^&*().,;[]{}|"


def md5(str1):
    m = hashlib.md5()
    m.update(str1)
    x = m.hexdigest()
    return x


def randUniqUsername(adjectives, nouns, usernames):
    user = randUsername(adjectives, nouns)

    if user in usernames:
        return randUniqUsername(adjectives, nouns, user)

    usernames.add(user)
    return user


def randUsername(adjectives, nouns):
    adje = random.choice(adjectives).capitalize()
    noun = random.choice(nouns).capitalize()

    n1 = random.choice(range(1, 19) + range(21, 99))
    n2 = random.randint(0, 99)

    username = adje + noun + ("%02d%02d" % ((int(n1), int(n2))))

    if len(username) > MAX_USERNAME_LEN:
        return randUsername(adjectives, nouns)

    return username


def randAlitCodename(adjectives, nouns):
    adje = random.choice(adjectives).capitalize()
    noun = "+"

    while adje[0] != noun[0]:
        noun = random.choice(nouns).capitalize()

    return (adje + noun)


def randCodename(adjectives, nouns):
    adje = random.choice(adjectives)
    noun = random.choice(nouns)

    return (adje + noun).upper()


def main():
    #conn = psycopg2.connect(dbname=DB_NAME, user=DB_USER,
    #                        host=DB_HOST, password=DB_PASS)
    #cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    password_words = getWords(PASSWORD_DICTIONARY_FILE)

    adjectives = getWords(ADJECTIVE_FILE)
    nouns = getWords(NOUN_FILE)

    if len(sys.argv) == 3:
        id_start = int(sys.argv[1])
        id_end   = int(sys.argv[2])
    elif len(sys.argv) == 1:
        id_start = ID_START
        id_end   = ID_END
    else:
        sys.stderr.write("Wrong number of arguments!\n")
        sys.exit(1)

    #for i in range(num):
    #    print randUsername(adjectives, nouns)

    info = INFO[TYPE]

    users = set()

    for index in range(id_start, id_end + 1):
        username = randUniqUsername(adjectives, nouns, users)
        #username = randUsername(adjectives, nouns)
        #username = randAlitCodename(adjectives, nouns)
        pswd = (getStrongPassword() if info['strength'] == "strong"
                else getWeakPassword(password_words))
        #username = randUsername(adjectives, nouns)
        email = username + info['domain']
        print username, email, pswd, info['phone']

        query = "UPDATE " + DB_TABLE + " SET " + \
                "\"username\" = %(username)s" + \
                ", \"email\" = %(email)s" + \
                ", \"phone\" = %(phone)s" + \
                ", \"password\" = %(password)s" + \
                " WHERE" + \
                " \"iid\" = %(iid)s and" + \
                " \"group\" = %(group)s and" + \
                " \"type\" = %(type)s"
        print query

        try:
            #cur.execute(query, {'username': username,
            #                    'email': email,
            #                    'password': pswd,
            #                    'phone': info['phone'],
            #                    'iid': index,
            #                    'group': GROUP,
            #                    'type': TYPE})
            pass
        except Exception as e:
            sys.stderr.write(
                "Caught exception: {} while executing on user {}\n".format(
                    e, username))
            conn.rollback()
            sys.exit(1)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    sys.exit(main())
