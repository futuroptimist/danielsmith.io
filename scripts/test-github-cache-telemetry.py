#!/usr/bin/env python3
"""Focused tests for the chart's dependency-free GitHub cache refresher."""

import datetime as dt
import importlib.util
import json
import pathlib
import tempfile
import unittest
import urllib.error
from unittest import mock


SCRIPT = (
    pathlib.Path(__file__).parents[1]
    / "charts/danielsmith/files/refresh-github-metrics.py"
)
SPEC = importlib.util.spec_from_file_location("github_cache", SCRIPT)
CACHE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(CACHE)
UTC = dt.timezone.utc


def response(stars):
    return {
        "stargazers_count": stars,
        "subscribers_count": 2,
        "forks_count": 1,
        "open_issues_count": 3,
        "pushed_at": "2026-09-01T00:00:00Z",
    }


class GitHubCacheTelemetryTest(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.output = str(pathlib.Path(self.temp_dir.name) / "github-metrics.json")
        self.repos = [
            {"owner": "futuroptimist", "repo": "one"},
            {"owner": "futuroptimist", "repo": "two"},
        ]
        self.now = dt.datetime(2026, 9, 15, 12, tzinfo=UTC)
        self.clock = mock.patch.object(CACHE, "utc_now", side_effect=lambda: self.now)
        self.clock.start()

    def tearDown(self):
        self.clock.stop()
        self.temp_dir.cleanup()

    def refresh(self, fetcher):
        return CACHE.refresh_once(self.repos, self.output, 5, 3600, fetcher=fetcher)

    def test_disabled_and_warming_contracts_do_not_fetch(self):
        disabled = json.loads(
            (SCRIPT.parents[3] / "public/runtime/github-metrics.json").read_text()
        )
        self.assertEqual(disabled["cache"]["state"], "disabled")
        self.assertFalse(disabled["cache"]["enabled"])
        warming = CACHE.warming_payload(2)
        self.assertEqual(warming["cache"]["state"], "warming")
        self.assertEqual(warming["cache"]["configuredRepositoryCount"], 2)

    def test_first_refresh_and_complete_recovery_are_fresh(self):
        payload = self.refresh(lambda _owner, repo, _timeout: response(len(repo)))
        self.assertEqual(payload["cache"]["state"], "fresh")
        self.assertEqual(payload["cache"]["dataCompleteness"], "complete")
        self.assertEqual(payload["cache"]["successfulRepositoryCount"], 2)
        self.assertEqual(payload["cache"]["lastSuccessfulRefreshAt"], payload["generatedAt"])
        self.assertEqual(len(payload["repos"]), 2)

    def test_partial_failure_retains_last_good_timestamp_and_reports_stale(self):
        first = self.refresh(lambda _owner, _repo, _timeout: response(7))
        first_time = first["repos"]["futuroptimist/two"]["fetchedAt"]
        self.now += dt.timedelta(hours=2)

        def partial(_owner, repo, _timeout):
            if repo == "two":
                raise urllib.error.URLError("private upstream detail")
            return response(8)

        payload = self.refresh(partial)
        self.assertEqual(payload["cache"]["state"], "stale")
        self.assertEqual(payload["cache"]["successfulRepositoryCount"], 1)
        self.assertEqual(payload["cache"]["failedRepositoryCount"], 1)
        self.assertEqual(payload["cache"]["retainedRepositoryCount"], 1)
        self.assertEqual(payload["cache"]["failureCategories"], ["network"])
        self.assertEqual(payload["repos"]["futuroptimist/two"]["fetchedAt"], first_time)
        self.assertEqual(payload["generatedAt"], first_time)
        self.assertEqual(payload["cache"]["retainedDataAgeSeconds"], 7200)
        self.assertNotIn("private upstream detail", json.dumps(payload))

    def test_all_failed_refresh_preserves_last_success_and_rate_limit_category(self):
        first = self.refresh(lambda _owner, _repo, _timeout: response(7))
        self.now += dt.timedelta(hours=1)

        def limited(_owner, _repo, _timeout):
            raise urllib.error.HTTPError("redacted", 429, "secret", {}, None)

        payload = self.refresh(limited)
        self.assertEqual(payload["cache"]["state"], "stale")
        self.assertEqual(payload["cache"]["retainedRepositoryCount"], 2)
        self.assertEqual(payload["cache"]["failureCategories"], ["rate_limited"])
        self.assertEqual(
            payload["cache"]["lastSuccessfulRefreshAt"],
            first["cache"]["lastSuccessfulRefreshAt"],
        )
        self.assertEqual(payload["generatedAt"], first["generatedAt"])

        self.now += dt.timedelta(minutes=1)
        recovered = self.refresh(lambda _owner, _repo, _timeout: response(9))
        self.assertEqual(recovered["cache"]["state"], "fresh")
        self.assertGreater(
            recovered["cache"]["lastSuccessfulRefreshAt"],
            first["cache"]["lastSuccessfulRefreshAt"],
        )

    def test_first_failure_is_unavailable_and_categories_are_bounded(self):
        payload = self.refresh(
            lambda _owner, _repo, _timeout: (_ for _ in ()).throw(ValueError("raw"))
        )
        self.assertEqual(payload["cache"]["state"], "unavailable")
        self.assertEqual(payload["cache"]["dataCompleteness"], "none")
        self.assertEqual(payload["cache"]["failureCategories"], ["invalid_response"])
        self.assertEqual(payload["repos"], {})
        self.assertNotIn("raw", json.dumps(payload))

    def test_repository_and_serialized_values_are_bounded(self):
        repos_path = pathlib.Path(self.temp_dir.name) / "repos.json"
        repos_path.write_text(json.dumps([{"owner": "bad/name", "repo": "repo"}]))
        with self.assertRaises(ValueError):
            CACHE.load_repos(repos_path)
        repos_path.write_text(
            json.dumps([{"owner": "owner", "repo": f"repo-{index}"} for index in range(51)])
        )
        with self.assertRaises(ValueError):
            CACHE.load_repos(repos_path)
        record = CACHE.repo_record("owner", "repo", "2026-09-15T12:00:00.000Z", response(10**30))
        self.assertEqual(record["stars"], 2_147_483_647)
        self.assertEqual(record["htmlUrl"], "https://github.com/owner/repo")


if __name__ == "__main__":
    unittest.main()
