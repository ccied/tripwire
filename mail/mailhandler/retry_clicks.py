import sys

import handle_email


def main():
    handler = handle_email.get_handler()
    handler.retry_recent_error_clicks('10 days', [124, 1])
    handler.commit()

if __name__ == "__main__":
    sys.exit(main())

