#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

REQUIRED_FILES = {
    "README.md": ["# seniorhub", "## Objective", "## Quality checks"],
    "CHANGELOG.md": ["# Changelog", "## [Unreleased]"],
    "AGENTS.md": ["# AGENTS.md", "## Project objective", "## Contribution workflow"],
    "ARCHITECTURE.md": ["# ARCHITECTURE.md", "## 1. Technical vision"],
    "TODO.md": ["# TODO.md"],
    "IDEAS.md": ["# IDEAS.md"],
    "CONTRIBUTING.md": ["# CONTRIBUTING.md", "## Commit format", "## Mandatory checks before commit"],
}


def main() -> int:
    errors: list[str] = []

    for file_name, required_tokens in REQUIRED_FILES.items():
        file_path = ROOT / file_name
        if not file_path.exists():
            errors.append(f"Missing required documentation file: {file_name}")
            continue

        content = file_path.read_text(encoding="utf-8")
        for token in required_tokens:
            if token not in content:
                errors.append(f"{file_name}: missing required section/token: {token}")

    if errors:
        print("Documentation guard failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print("Documentation guard passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
