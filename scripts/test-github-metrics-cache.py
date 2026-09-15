#!/usr/bin/env python3
"""Focused tests for the Helm-embedded GitHub cache refresher."""

import datetime as dt
import json
import tempfile
import unittest
import urllib.error
from pathlib import Path
from unittest import mock


TEMPLATE = (
    Path(__file__).parents[1]
    / "charts/danielsmith/templates/github-metrics-cache-configmap.yaml"
)


def load_module():
    text = TEMPLATE.read_text(encoding="utf-8")
    body = text.split("  refresh-github-metrics.py: |\n", 1)[1].rsplit("\n{{- end }}", 1)[0]
    source = "\n".join(line[4:] if line.startswith("    ") else line for line in body.splitlines())
    namespace = {"__name__": "github_metrics_cache_test"}
    exec(compile(source, str(TEMPLATE), "exec"), namespace)
    return namespace


CACHE = load_module()
REPOS = [
    {"owner": "futuroptimist", "repo": "one"},
    {"owner": "futuroptimist", "repo": "two"},
]
NOW = dt.datetime(2026, 9, 15, 12, 0, tzinfo=dt.timezone.utc)


def upstream(stars=1):
    return {
        "stargazers_count": stars,
        "subscribers_count": 2,
        "forks_count": 3,
        "open_issues_count": 4,
        "pushed_at": "2026-09-15T11:00:00Z",
    }


class CacheTelemetryTests(unittest.TestCase):
    def build(self, effects, previous=None):
        replacements = {
            "fetch_repo": mock.Mock(side_effect=effects),
            "utc_now": lambda: NOW,
        }
        with mock.patch.dict(CACHE, replacements):
            return CACHE["build_payload"](REPOS, 5, 4500, previous)

    def test_first_complete_refresh_and_recovery(self):
        first = self.build([upstream(1), upstream(2)])
        self.assertEqual(first["telemetry"]["state"], "fresh")
        self.assertEqual(first["telemetry"]["lastSuccessfulRefreshAt"], "2026-09-15T12:00:00.000Z")
        failed = self.build([TimeoutError(), TimeoutError()], first)
        recovered = self.build([upstream(3), upstream(4)], failed)
        self.assertEqual(recovered["telemetry"]["state"], "fresh")
        self.assertEqual(recovered["telemetry"]["retainedRepositoryCount"], 0)

    def test_partial_failure_retains_last_good_timestamp(self):
        first = self.build([upstream(1), upstream(2)])
        old_record = first["repos"]["futuroptimist/two"]
        error = urllib.error.HTTPError("url", 500, "secret", {}, None)
        partial = self.build([upstream(5), error], first)
        self.assertEqual(partial["telemetry"]["completeness"], "partial")
        self.assertEqual(partial["telemetry"]["retainedRepositoryCount"], 1)
        self.assertEqual(partial["repos"]["futuroptimist/two"], old_record)
        self.assertEqual(partial["telemetry"]["oldestDataAt"], old_record["fetchedAt"])
        self.assertEqual(
            partial["telemetry"]["lastSuccessfulRefreshAt"],
            first["telemetry"]["lastSuccessfulRefreshAt"],
        )

    def test_rate_limit_is_bounded_and_sanitized(self):
        error = urllib.error.HTTPError("url", 429, "token leaked", {}, None)
        limited = self.build([error, upstream()])
        self.assertEqual(limited["errors"]["futuroptimist/one"]["category"], "rate_limited")
        self.assertNotIn("token", json.dumps(limited))
        self.assertEqual(limited["telemetry"]["failureCategories"], {"rate_limited": 1})

    def test_unavailable_without_last_good(self):
        payload = self.build([OSError("private host"), TimeoutError("secret")])
        self.assertEqual(payload["telemetry"]["state"], "unavailable")
        self.assertEqual(payload["telemetry"]["completeness"], "none")
        self.assertEqual(payload["repos"], {})
        self.assertNotIn("private host", json.dumps(payload))

    def test_configuration_and_numeric_bounds(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "repos.json"
            path.write_text(json.dumps([{"owner": "bad/name", "repo": "repo"}]), encoding="utf-8")
            with self.assertRaises(ValueError):
                CACHE["load_repos"](path)
            too_many = [{"owner": "a", "repo": str(i)} for i in range(51)]
            path.write_text(json.dumps(too_many), encoding="utf-8")
            with self.assertRaises(ValueError):
                CACHE["load_repos"](path)
        record = CACHE["repo_record"]("a", "b", "now", {"stargazers_count": 10**30})
        self.assertEqual(record["stars"], 2_147_483_647)

    def test_disabled_static_contract(self):
        static_path = TEMPLATE.parents[3] / "public/runtime/github-metrics.json"
        payload = json.loads(static_path.read_text())
        self.assertEqual(payload["telemetry"]["state"], "disabled")
        self.assertFalse(payload["telemetry"]["cacheEnabled"])

    def test_warmup_and_telemetry_reads_make_no_upstream_requests(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "github-metrics.json"
            fetch = mock.Mock(side_effect=[upstream(), upstream()])
            original_write = CACHE["atomic_write_json"]
            observed = []
            def capture(path, payload):
                observed.append(payload)
                original_write(path, payload)
            replacements = {
                "fetch_repo": fetch,
                "atomic_write_json": capture,
                "utc_now": lambda: NOW,
            }
            with mock.patch.dict(CACHE, replacements):
                CACHE["refresh_once"](REPOS, str(output), 5, 4500)
            self.assertEqual(observed[0]["telemetry"]["state"], "warmup")
            calls_after_refresh = fetch.call_count
            for _ in range(3):
                json.loads(output.read_text(encoding="utf-8"))["telemetry"]
            self.assertEqual(fetch.call_count, calls_after_refresh)


if __name__ == "__main__":
    unittest.main()
