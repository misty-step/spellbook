#!/usr/bin/env python3
"""Read-only live check of the Readwise credential the ingester uses. Prints numbers only.

Usage (the same reference file the timer uses; the token never leaves the environment):
  pass-env run -f ~/.config/daybook-ingest.env.pass -- python3 -I readwise-probe.py --vault PATH

It makes two GET requests: the Readwise token check (204 means the token is valid) and one
page of the Reader list the ingester reads. It reports HTTP statuses, the account's document
count, and how many returned document ids already have a note in the vault's raw/readwise/
(proof that the token belongs to the account the vault's captures came from). It never
prints a token, a title, a URL or any document text. Exit 1 if any proof is missing.
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

AUTH = "https://readwise.io/api/v2/auth/"
LIST = "https://readwise.io/api/v3/list/"


def get(url, token):
    req = urllib.request.Request(url, headers={"Authorization": f"Token {token}"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            body = r.read()
            return r.status, (json.loads(body) if body else None)
    except urllib.error.HTTPError as e:
        return e.code, None
    except (urllib.error.URLError, TimeoutError) as e:
        return f"unreachable ({type(e).__name__})", None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--vault", type=Path, required=True)
    a = ap.parse_args()
    token = os.environ.get("READWISE_ACCESS_TOKEN")
    if not token:
        print("FAIL readwise-token: READWISE_ACCESS_TOKEN is not set in this environment")
        return 1
    ok = True
    status, _ = get(AUTH, token)
    print(f"{'PASS' if status == 204 else 'FAIL'} readwise-auth: GET /api/v2/auth/ -> HTTP {status}")
    ok &= status == 204
    status, data = get(LIST, token)
    results = (data or {}).get("results") or []
    print(f"{'PASS' if status == 200 else 'FAIL'} readwise-list: GET /api/v3/list/ -> HTTP {status}, "
          f"account documents {(data or {}).get('count')}, first page {len(results)}")
    ok &= status == 200 and bool(results)
    ids = set()
    for p in (a.vault / "raw/readwise").glob("*/*.md"):
        with open(p, encoding="utf-8", errors="replace") as f:
            for n, line in enumerate(f):
                if line.startswith("reader_id:"):
                    ids.add(json.loads(line.split(":", 1)[1].strip()))
                    break
                if n and line.strip() == "---":
                    break  # end of frontmatter: never read the body
    match = sum(1 for d in results if d.get("id") in ids or d.get("parent_id") in ids)
    print(f"{'PASS' if match else 'FAIL'} readwise-owner: {match} of {len(results)} first-page documents "
          f"match the {len(ids)} reader_id values in raw/readwise/")
    ok &= match > 0
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
