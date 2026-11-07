#!/usr/bin/env python3
"""Seed demo data into a running cluster (via port-forwards).

Services: identity :8081, catalog :8082 (or :8089 spare), commerce :8083.
Idempotent: fixed IDs + login-recovery, safe to re-run.

Usage:
    python scripts/seed-demo.py
"""
import json
import os
import sys
import urllib.request

IDENTITY = "http://127.0.0.1:8081"
CATALOG = os.environ.get("SEED_CATALOG_URL", "http://127.0.0.1:8082")
COMMERCE = "http://127.0.0.1:8083"


def call(method, url, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method,
                                 headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            raw = r.read().decode()
            return r.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:200]


def main():
    ok = True

    # 1. Users (author, artist, admin, alice) — 409 means already seeded.
    users = {}
    for email, role in [("author@manga.com", "uploader"), ("artist@manga.com", "uploader"),
                        ("admin@platform.com", "admin"), ("alice@reader.com", "user")]:
        status, body = call("POST", f"{IDENTITY}/users",
                            {"email": email, "password": "pass123", "role": role})
        if status in (200, 201) and isinstance(body, dict):
            users[email] = body["id"]
            print(f"user {email}: {body['id']}")
        else:
            status2, sess = call("POST", f"{IDENTITY}/sessions",
                                 {"email": email, "password": "pass123"})
            if status2 in (200, 201) and isinstance(sess, dict) and "user_id" in sess:
                users[email] = sess["user_id"]
                print(f"user {email}: recovered {sess['user_id']}")
            else:
                print(f"user {email}: failed ({status}/{status2})")
                ok = False

    # 2. Story with 70/30 split (fixed ID for idempotency)
    author = users.get("author@manga.com", "author-1")
    artist = users.get("artist@manga.com", "artist-1")
    status, story = call("POST", f"{CATALOG}/stories", {
        "id": "story_demo-slayer", "owner_id": author,
        "type": "manga", "title": "Demon Slayer Gaiden", "synopsis": "Epic demo series",
        "tags": ["Action"], "splits": [
            {"creator_id": author, "percentage": 70},
            {"creator_id": artist, "percentage": 30}],
    })
    story_id = story["id"] if isinstance(story, dict) else "story_demo-slayer"
    print(f"story: {story_id} ({status})")

    # 3. Free ch1 + locked ch2 (40 coins)
    for cid, num, title, price in [("chap_demo-ch1", 1, "Chapter 1: The Beginning", 0),
                                  ("chap_demo-ch2", 2, "Chapter 2: The Battle", 40)]:
        status, _ = call("POST", f"{CATALOG}/stories/{story_id}/chapters", {
            "id": cid, "order_index": num, "title": title, "price_coins": price,
            "page_keys": [f"stories/demo/ch{num}/p1.webp"], "novel_text": "",
        })
        print(f"chapter {cid}: {status}")

    # 4. Alice top-up 100 (idempotent webhook key)
    alice = users.get("alice@reader.com", "")
    if alice:
        status, _ = call("POST", f"{COMMERCE}/topups", {
            "user_id": alice, "amount": 100, "coin_type": "purchased",
            "ref_id": "gw-txn-98765", "idempotency_key": "idem-webhook-alice-100"})
        print(f"topup alice: {status}")
        status, wallet = call("GET", f"{COMMERCE}/wallets/{alice}")
        print(f"alice wallet: {wallet}")
    else:
        print("alice missing: topup skipped")
        ok = False

    # 5. Print IDs for the demo script.
    print("---DEMO-IDS---")
    for email, uid in users.items():
        print(f"{email}: {uid}")
    print(f"story: {story_id}, chapters: chap_demo-ch1 (free), chap_demo-ch2 (40c)")

    print("SEED-OK" if ok else "SEED-PARTIAL")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
