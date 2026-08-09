#!/usr/bin/env python3
"""Focused regression tests for résumé ATS extraction policy."""

from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path


SCRIPT_PATH = Path(__file__).parents[1] / "resume-ats-smoke.py"
SPEC = importlib.util.spec_from_file_location("resume_ats_smoke", SCRIPT_PATH)
assert SPEC and SPEC.loader
RESUME_ATS_SMOKE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = RESUME_ATS_SMOKE
SPEC.loader.exec_module(RESUME_ATS_SMOKE)


class BrokenWordLineBreakTests(unittest.TestCase):
    def test_detects_line_ending_hyphenation(self) -> None:
        self.assertEqual(
            RESUME_ATS_SMOKE.broken_word_line_breaks(
                "reusable run-\nbooks and engineer-\ning practices"
            ),
            ["run-\nbooks", "engineer-\ning"],
        )

    def test_allows_hyphens_that_do_not_end_a_line(self) -> None:
        self.assertEqual(
            RESUME_ATS_SMOKE.broken_word_line_breaks(
                "incident-response systems\nOpenAI-compatible APIs"
            ),
            [],
        )


if __name__ == "__main__":
    unittest.main()
