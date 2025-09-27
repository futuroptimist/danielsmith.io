#!/usr/bin/env python3
"""Lightweight secret scanner for staged diffs.

The script reads diff content from stdin and exits non-zero if high-risk
credentials (AWS keys, generic secret markers, private keys) are detected.
"""
from __future__ import annotations

import re
import sys
from typing import Iterable

PATTERNS: Iterable[tuple[str, re.Pattern[str]]] = (
    ("AWS Access Key", re.compile(r"AKIA[0-9A-Z]{16}")),
    ("AWS Temporary Access Key", re.compile(r"ASIA[0-9A-Z]{16}")),
    ("Google API Key", re.compile(r"AIza[0-9A-Za-z_-]{35}")),
    (
        "Generic Secret",
        re.compile(r"(?i)(api|auth|secret|token|password)[^\n]{0,5}[:=][ \t]*['\"]?[A-Za-z0-9/_\-]{16,}"),
    ),
    ("Private Key Block", re.compile(r"-----BEGIN (?:RSA |DSA |EC )?PRIVATE KEY-----")),
)


def main() -> int:
    diff = sys.stdin.read()
    if not diff.strip():
        return 0

    findings: list[str] = []
    for label, pattern in PATTERNS:
        if pattern.search(diff):
            findings.append(label)

    if findings:
        unique_labels = sorted(set(findings))
        sys.stderr.write(
            "Potential secret patterns detected: " + ", ".join(unique_labels) + "\n"
        )
        return 1

    print("No high-risk secrets detected.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
