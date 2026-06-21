#!/usr/bin/env python3
"""Validate and summarize local pdftotext resume extraction quality."""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class CheckResult:
    label: str
    passed: bool
    detail: str = ""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pdf", required=True, help="Generated PDF path.")
    parser.add_argument("--tex-source", required=True, help="Selected TeX source path.")
    parser.add_argument("--version", required=True, help="Selected resume version.")
    parser.add_argument("--pdf-pages", required=True, help="Generated PDF page count.")
    parser.add_argument("--plain-text", required=True, help="Plain pdftotext output path.")
    parser.add_argument("--layout-text", required=True, help="Layout pdftotext output path.")
    parser.add_argument("--summary", required=True, help="GitHub step summary path.")
    parser.add_argument(
        "--config",
        default="docs/resume/ats-smoke.json",
        help="Smoke policy JSON path.",
    )
    return parser.parse_args()


def load_config(path: Path) -> dict:
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def normalized_heading(line: str) -> str:
    return re.sub(r"\s+", " ", line.strip()).strip(":")


def heading_positions(lines: list[str], headings: set[str]) -> dict[str, int]:
    positions: dict[str, int] = {}
    offset = 0
    for line in lines:
        heading = normalized_heading(line)
        if heading in headings and heading not in positions:
            positions[heading] = offset + line.find(line.strip())
        offset += len(line) + 1
    return positions


def fallback_position(text: str, positions: dict[str, int], term: str) -> int:
    return positions.get(term, text.find(term))


def section_slice(
    text: str,
    heading_positions_by_name: dict[str, int],
    section: str,
) -> str:
    start = heading_positions_by_name.get(section, text.find(section))
    if start == -1:
        return ""
    following = [
        pos
        for name, pos in heading_positions_by_name.items()
        if pos > start and name != section
    ]
    end = min(following) if following else len(text)
    return text[start:end]


def education_pair_observations(
    config: dict,
    plain: str,
    heading_positions_by_name: dict[str, int],
) -> tuple[list[str], list[str], list[str]]:
    education_config = config.get("educationPairing", {})
    window = int(education_config.get("nearbyWindowCharacters", 240))
    severity = education_config.get("severity", "warning")
    prefix = "⚠️" if severity == "warning" else "❌"
    education_text = section_slice(plain, heading_positions_by_name, "Education")
    lines = education_text.splitlines()
    observations: list[str] = []
    warnings: list[str] = []
    failures: list[str] = []

    for degree, date in education_config.get("pairs", []):
        same_line = any(degree in line and date in line for line in lines)
        degree_pos = education_text.find(degree)
        date_pos = education_text.find(date)
        nearby = (
            degree_pos != -1
            and date_pos != -1
            and abs(degree_pos - date_pos) <= window
        )
        label = f"`{degree}` / `{date}`"
        if same_line:
            observations.append(f"✅ {label} — same extracted line")
        elif nearby:
            message = f"Education pair not on same extracted line: {label}"
            observations.append(f"{prefix} {message} — nearby text window")
            if severity == "warning":
                warnings.append(message)
            else:
                failures.append(message)
        else:
            message = f"Education pair detached / not found nearby: {label}"
            observations.append(f"{prefix} {message}")
            if severity == "warning":
                warnings.append(message)
            else:
                failures.append(message)
    return observations, warnings, failures


def main() -> int:
    args = parse_args()
    config = load_config(Path(args.config))
    plain_path = Path(args.plain_text)
    layout_path = Path(args.layout_text)
    plain = plain_path.read_text(encoding="utf-8", errors="replace")
    layout = layout_path.read_text(encoding="utf-8", errors="replace")
    plain_lines = plain.splitlines()
    failures: list[str] = []
    warnings: list[str] = []
    checklist: list[CheckResult] = []

    def check(label: str, passed: bool, detail: str = "") -> None:
        checklist.append(CheckResult(label, passed, detail))
        if not passed:
            failures.append(label if not detail else f"{label}: {detail}")

    plain_chars = len(plain)
    layout_chars = len(layout)
    min_plain_chars = int(config.get("minimumPlainCharacters", 3000))
    check("Plain extracted text is non-empty", plain_chars > 0, f"{plain_chars} chars")
    check(
        "Plain extracted text is reasonably large",
        plain_chars >= min_plain_chars,
        f"{plain_chars} chars",
    )
    check("PDF page count is one", args.pdf_pages == "1", args.pdf_pages)

    for term in config.get("requiredTerms", []):
        check(f"Required text present: `{term}`", term in plain)

    section_names = {
        section for pair in config.get("sectionOrderPairs", []) for section in pair
    }
    headings = heading_positions(plain_lines, section_names)
    for before, after in config.get("sectionOrderPairs", []):
        before_pos = fallback_position(plain, headings, before)
        after_pos = fallback_position(plain, headings, after)
        check(
            f"Section order: `{before}` before `{after}`",
            before_pos != -1 and after_pos != -1 and before_pos < after_pos,
            f"positions {before_pos}, {after_pos}",
        )

    education_observations, education_warnings, education_failures = (
        education_pair_observations(config, plain, headings)
    )
    warnings.extend(education_warnings)
    failures.extend(education_failures)

    if re.search(r"[A-Za-z]-\n[A-Za-z]", plain):
        warnings.append("Possible hyphenated line break found in plain extraction.")
    if re.search(r"\b[A-Za-z]{1,2}\n[A-Za-z]{1,2}\n", plain):
        warnings.append("Possible unusually short wrapped words found in plain extraction.")

    preview = "\n".join(plain_lines[:120])
    with Path(args.summary).open("a", encoding="utf-8") as fh:
        fh.write("## ATS smoke report\n\n")
        fh.write(f"- Selected TeX source: `{args.tex_source}`\n")
        fh.write(f"- Selected resume version: `{args.version}`\n")
        fh.write(f"- Generated PDF path: `{args.pdf}`\n")
        fh.write(f"- PDF page count: `{args.pdf_pages}`\n")
        fh.write(f"- Plain extracted character count: `{plain_chars}`\n")
        fh.write(f"- Layout extracted character count: `{layout_chars}`\n\n")
        fh.write("### Pass/fail checklist\n\n")
        for result in checklist:
            suffix = f" — {result.detail}" if result.detail else ""
            fh.write(f"- {'✅' if result.passed else '❌'} {result.label}{suffix}\n")
        if education_observations:
            fh.write("\n### Education pairing observations\n\n")
            for observation in education_observations:
                fh.write(f"- {observation}\n")
        if warnings:
            fh.write("\n### Non-blocking warnings\n\n")
            for warning in warnings:
                fh.write(f"- ⚠️ {warning}\n")
        fh.write("\n<details>\n<summary>First 120 lines of plain extraction</summary>\n\n")
        fh.write("```text\n")
        fh.write(preview)
        if preview and not preview.endswith("\n"):
            fh.write("\n")
        fh.write("```\n\n</details>\n")

    if failures:
        for failure in failures:
            print(f"::error::{failure}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
