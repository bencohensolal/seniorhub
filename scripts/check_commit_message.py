#!/usr/bin/env python3
from __future__ import annotations

import re
import sys
from pathlib import Path

PATTERN = re.compile(r"^(feat|fix|refactor|test|docs|chore)\([a-z0-9-]+\): .+")


def main() -> int:
    if len(sys.argv) < 2:
        print("Missing commit message file path.")
        return 1

    commit_msg_path = Path(sys.argv[1])
    if not commit_msg_path.exists():
        print(f"Commit message file not found: {commit_msg_path}")
        return 1

    lines = commit_msg_path.read_text(encoding="utf-8").splitlines()
    if not lines:
        print("Empty commit message.")
        return 1

    header = lines[0].strip()
    if not PATTERN.match(header):
        print("Invalid commit header format.")
        print("Expected: type(name): summary")
        print("Allowed types: feat, fix, refactor, test, docs, chore")
        return 1

    if len(lines) > 1 and lines[1].strip() != "":
        print("Second line must be empty.")
        print("Expected format: header, blank line, description")
        return 1

    if len(lines) < 3 or not lines[2].strip():
        print("Commit description is required after blank line.")
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
