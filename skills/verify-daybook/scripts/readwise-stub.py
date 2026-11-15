#!/usr/bin/env python3
"""Local stand-in for the Readwise Reader list API, for fixture runs only.

Usage: python3 -I readwise-stub.py --port-file PATH --log PATH [--token fixture-readwise-token]

The first path segment selects the behaviour, so one stub serves every state:
  /ok/api/v3/list/        two saved documents (one with a highlight), one unread feed item,
                          split over two pages; honours updatedAfter
  /empty/api/v3/list/     no documents (an empty day)
  /error500/api/v3/list/  HTTP 500 with Retry-After: 0 on the first call, then like /ok/
  /slow/api/v3/list/      like /ok/ after a 5 second delay per page
Any request whose Authorization header is not "Token <token>" gets HTTP 401, as Readwise
does for a missing, invalid or expired token. Every request is appended to --log as one
JSON line (mode, query keys, whether the token matched). The token is fixture data.
"""
import argparse
import http.server
import json
import threading
import time
import urllib.parse

SAVED = "2026-10-20T15:00:00+00:00"
DOCS = [
    {"id": "01fixturedocaaaaaaaaaaaa1", "category": "article", "location": "new",
     "title": "Fixture article one", "author": "Fixture Author", "source_url": "https://example.invalid/one",
     "url": "https://read.readwise.io/read/01fixturedocaaaaaaaaaaaa1", "site_name": "example.invalid",
     "published_date": "2026-10-19", "saved_at": SAVED, "created_at": SAVED, "updated_at": SAVED,
     "source": "fixture", "summary": "Fixture summary one.", "notes": "Fixture owner note.",
     "tags": {"fixture": {}}, "html_content": "<p>Fixture body <b>one</b>.</p>"},
    {"id": "01fixturedocbbbbbbbbbbbb2", "category": "tweet", "location": "later",
     "title": "Fixture tweet two", "author": "Fixture Poster", "source_url": "https://example.invalid/two",
     "url": "https://read.readwise.io/read/01fixturedocbbbbbbbbbbbb2", "site_name": "example.invalid",
     "published_date": "2026-10-20", "saved_at": SAVED, "created_at": SAVED, "updated_at": SAVED,
     "source": "fixture", "summary": "", "notes": "", "tags": {}, "html_content": "<p>Fixture tweet.</p>"},
    {"id": "01fixturefeedcccccccccc3", "category": "rss", "location": "feed",
     "title": "Fixture unread feed item", "source_url": "https://example.invalid/feed",
     "saved_at": SAVED, "created_at": SAVED, "updated_at": SAVED, "html_content": "<p>feed</p>"},
    {"id": "01fixturehighlightddddd4", "category": "highlight", "parent_id": "01fixturedocaaaaaaaaaaaa1",
     "content": "Fixture highlighted sentence.", "notes": "Fixture highlight note.",
     "created_at": SAVED, "updated_at": SAVED},
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port-file", required=True)
    ap.add_argument("--log", required=True)
    ap.add_argument("--token", default="fixture-readwise-token")
    a = ap.parse_args()
    lock = threading.Lock()
    failed_once = set()

    class Handler(http.server.BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def reply(self, code, body=None, headers=()):
            data = json.dumps(body).encode() if body is not None else b""
            self.send_response(code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            for k, v in headers:
                self.send_header(k, v)
            self.end_headers()
            self.wfile.write(data)

        def do_GET(self):
            url = urllib.parse.urlsplit(self.path)
            mode = url.path.strip("/").split("/", 1)[0]
            q = dict(urllib.parse.parse_qsl(url.query))
            authed = self.headers.get("Authorization") == f"Token {a.token}"
            with lock, open(a.log, "a") as f:
                f.write(json.dumps({"t": time.time(), "mode": mode, "query": sorted(q),
                                    "updatedAfter": q.get("updatedAfter"), "token_ok": authed}) + "\n")
            if not authed:
                return self.reply(401, {"detail": "Invalid token."})
            if mode == "error500" and mode not in failed_once:
                failed_once.add(mode)
                return self.reply(500, {"detail": "fixture outage"}, [("Retry-After", "0")])
            if mode == "slow":
                time.sleep(5)
            if mode == "empty":
                return self.reply(200, {"count": 0, "nextPageCursor": None, "results": []})
            docs = DOCS
            if q.get("id"):
                docs = [d for d in DOCS if d["id"] == q["id"]]
            elif q.get("updatedAfter"):
                docs = [d for d in DOCS if d["updated_at"] > q["updatedAfter"]]
            if q.get("pageCursor") == "page2":
                return self.reply(200, {"count": len(docs), "nextPageCursor": None, "results": docs[2:]})
            nxt = "page2" if len(docs) > 2 else None
            return self.reply(200, {"count": len(docs), "nextPageCursor": nxt, "results": docs[:2]})

    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    with open(a.port_file, "w") as f:
        f.write(str(srv.server_address[1]))
    srv.serve_forever()


if __name__ == "__main__":
    main()
