#!/usr/bin/python

DB_NAME     = ""  # BLANKED
#DB_NAME     = ""  # BLANKED
DB_USER     = ""  # BLANKED
DB_HOST     = ""  # BLANKED
DB_PASS     = ""  # BLANKED
DB_TABLE    = ""  # BLANKED


import sys
import getopt
import os

import email
import email.parser
import email.message
import email.header
import re

import psycopg2
import psycopg2.extras

import subprocess

ADDRESS_PATTERN = re.compile(".* <(.*@.*)>$")

## Just FYI:
#define EX_OK           0       /* successful termination */
#define EX__BASE        64      /* base value for error messages */
#define EX_USAGE        64      /* command line usage error */
#define EX_DATAERR      65      /* data format error */
#define EX_NOINPUT      66      /* cannot open input */    
#define EX_NOUSER       67      /* addressee unknown */    
#define EX_NOHOST       68      /* host name unknown */
#define EX_UNAVAILABLE  69      /* service unavailable */
#define EX_SOFTWARE     70      /* internal software error */
#define EX_OSERR        71      /* system error (e.g., can't fork) */
#define EX_OSFILE       72      /* critical OS file missing */
#define EX_CANTCREAT    73      /* can't create (user) output file */
#define EX_IOERR        74      /* input/output error */
#define EX_TEMPFAIL     75      /* temp failure; user is invited to retry */
#define EX_PROTOCOL     76      /* remote error in protocol */
#define EX_NOPERM       77      /* permission denied */
#define EX_CONFIG       78      /* configuration error */

#define EX__MAX 78      /* maximum listed value */

class MailHandler:
    URL_PATTERN = r"(?<!(src)=(\"|'))(https?://[a-z0-9.-]+/([a-z0-9./?!@#$%^&*()_=+-;:]+)(?<!\.(gif|jpg|png)))(\s|$|\"|'|<)" # Case-insensitive only!
    BONUSES = [ (r"confirm", 50),
                (r"verify", 50),
                (r"activate", 50),
                (r"validate", 50),
                (r"account", 20),
                (r"signup", 20),
                (r"setup", 20),
                (r"delete", -100),
                (r"spam", -100) ]

    REPEAT_BONUS = 20

    SUBJECT_PATTERNS = [r"activate",
                        r"confirm",
                        r"verif",
                        r"regist",
                        r"account",
                        r"complete",
                        r"setup",
                        r"welcome"]

    def __findTo(self, message):
        #if 'x-original-to' in message:
        #    toAddr = message['x-original-to']
        #if 'delivered-to' in message:
        #    toAddr = message['delivered-to']
        if 'to' in message:
            toAddr = message['to']
        else:
            return None

        # Look for and strip out the "John Smith <jsmith@foo.com>" Pattern.
        match = ADDRESS_PATTERN.match(toAddr)
        if match:
            return match.group(1)

        return toAddr

    def __getPayload(self, msg):
        (ign, payload) = self.__getWeightPayload(msg)
        return payload

    def __getWeightPayload(self, msg):
        weight = 100
        payload = ""
        ct = msg.get_content_type()
        #print ct
        if ct == "text/plain":
            payload = msg.get_payload(decode=True)
            weight = 1
        elif ct == "text/html":
            payload = msg.get_payload(decode=True)
            weight = 5
        elif msg.is_multipart():
            best = 100
            for part in msg.get_payload():
                (mw, mp) = self.__getWeightPayload(part)
                if mw < best:
                    weight = mw
                    payload = mp
        else:
            pass #raise Exception("Unknown content type")
        return (weight, payload)

    def log(self, level, message):
        print level, message

    @staticmethod
    def __lenCompare(a, b):
        v = b['weight'] - a['weight']
        #if v == 0:
        #    return a['tb'] - b['tb']
        return v

    def __getURLList(self, payload):
        expr = re.compile(self.URL_PATTERN, flags=re.IGNORECASE)

        #print payload
        #print "========"

        urlCheck = dict()

        urls = []
        #i = 0
        for match in expr.findall(payload):
            #print match
            url = match[2]
            not_domain = match[3]
            
            weight = len(url)

            for bonus in self.BONUSES:
                if re.search(bonus[0], not_domain, flags=re.IGNORECASE) != None:
                    weight += bonus[1]

            if url in urlCheck:
                urls[urlCheck[url]]["weight"] += self.REPEAT_BONUS
                continue

            urls.append({"url": url, "weight": weight}) #, "tb": i})
            urlCheck[url] = len(urls) - 1
            #i+=1

        urls.sort(MailHandler.__lenCompare)
        return urls

    def acceptMail(self, text):
        message = email.message_from_string(text)

        toAddr = self.__findTo(message)
        if toAddr == None:
            self.log("warning", "Message to unknown recipient")
            return 1

        nameMatch   = re.search("([^@]+)@.*", toAddr)
        toName      = nameMatch.group(1) if nameMatch is not None else ""

        payload = self.__getPayload(message).replace('\r', '').replace('=\n', '')
        print payload

        urls = self.__getURLList(payload)
        url = urls[0]["url"]

        if len(urls) < 0:
            self.log("info", "Message had no interesting links: " + message['subject'])
            return 0
        print url

        return 0

def getHandler():
    return MailHandler()

def main():

    mh = getHandler()
    mh.acceptMail(sys.stdin.read())

    return 0

if __name__ == "__main__":
    sys.exit(main())
