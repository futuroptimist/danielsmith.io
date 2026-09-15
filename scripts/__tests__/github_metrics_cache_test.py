import datetime as dt
import importlib.util
import json
import pathlib
import tempfile
import unittest
import urllib.error


SCRIPT = pathlib.Path(__file__).parents[2] / "charts/danielsmith/files/refresh-github-metrics.py"
SPEC = importlib.util.spec_from_file_location("github_metrics_cache", SCRIPT)
cache = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(cache)


class Clock:
    def __init__(self, timestamp="2026-09-15T12:00:00+00:00"):
        self.now = dt.datetime.fromisoformat(timestamp)
        self.monotonic = 10.0

    def utc_now(self):
        return self.now

    def monotonic_now(self):
        self.monotonic += 0.025
        return self.monotonic


REPOS = [
    {"owner": "futuroptimist", "repo": "danielsmith.io"},
    {"owner": "futuroptimist", "repo": "token.place"},
]


def response(stars=1):
    return {
        "stargazers_count": stars,
        "subscribers_count": 2,
        "forks_count": 3,
        "open_issues_count": 4,
        "pushed_at": "2026-09-15T11:00:00Z",
    }


def run_refresh(fetch, previous=None, clock=None):
    clock = clock or Clock()
    return cache.refresh(
        REPOS,
        5,
        4500,
        previous=previous,
        now_fn=clock.utc_now,
        monotonic_fn=clock.monotonic_now,
        fetch_fn=fetch,
    )


class GitHubMetricsCacheTests(unittest.TestCase):
    def test_initial_warmup_is_explicit_and_does_not_fetch(self):
        payload = cache.warmup_payload(2, Clock().utc_now)
        self.assertEqual(payload["telemetry"]["state"], "warmup")
        self.assertEqual(payload["telemetry"]["repositoryCounts"]["configured"], 2)
        self.assertEqual(payload["repos"], {})

    def test_first_complete_refresh_and_bounded_contract(self):
        payload = run_refresh(lambda _owner, _repo, _timeout: response(7))
        self.assertEqual(payload["schemaVersion"], 2)
        self.assertEqual(payload["telemetry"]["state"], "fresh")
        self.assertEqual(payload["telemetry"]["dataCompleteness"], "complete")
        self.assertEqual(
            payload["telemetry"]["repositoryCounts"],
            {"configured": 2, "successful": 2, "failed": 0, "retained": 0},
        )
        self.assertEqual(set(payload["telemetry"]["failureCategories"]),
                         set(cache.FAILURE_CATEGORIES))
        self.assertNotIn("message", json.dumps(payload))

    def test_partial_failure_retains_old_record_and_timestamp(self):
        first = run_refresh(lambda _owner, _repo, _timeout: response())
        old_record = first["repos"]["futuroptimist/token.place"]
        later = Clock("2026-09-15T14:00:00+00:00")

        def partial(_owner, repo, _timeout):
            if repo == "token.place":
                raise urllib.error.URLError("private request identity")
            return response(8)

        payload = run_refresh(partial, first, later)
        self.assertEqual(payload["telemetry"]["state"], "stale-fallback")
        self.assertEqual(payload["telemetry"]["dataCompleteness"], "partial")
        self.assertEqual(payload["telemetry"]["repositoryCounts"]["retained"], 1)
        self.assertEqual(payload["repos"]["futuroptimist/token.place"], old_record)
        self.assertEqual(payload["telemetry"]["dataGeneratedAt"], old_record["fetchedAt"])
        self.assertNotIn("private request identity", json.dumps(payload))

    def test_total_rate_limit_preserves_last_success_then_recovers(self):
        first = run_refresh(lambda _owner, _repo, _timeout: response())
        success_at = first["telemetry"]["lastSuccessfulRefreshAt"]

        def limited(_owner, _repo, _timeout):
            raise urllib.error.HTTPError("safe", 429, "secret", {}, None)

        failed = run_refresh(limited, first, Clock("2026-09-15T14:00:00+00:00"))
        self.assertEqual(failed["telemetry"]["state"], "stale-fallback")
        self.assertEqual(failed["telemetry"]["failureCategories"]["rate_limited"], 2)
        self.assertEqual(failed["telemetry"]["lastSuccessfulRefreshAt"], success_at)
        self.assertEqual(failed["generatedAt"], first["generatedAt"])
        self.assertEqual(failed["expiresAt"], first["expiresAt"])

        recovered = run_refresh(
            lambda _owner, _repo, _timeout: response(9),
            failed,
            Clock("2026-09-15T15:00:00+00:00"),
        )
        self.assertEqual(recovered["telemetry"]["state"], "fresh")
        self.assertEqual(recovered["telemetry"]["repositoryCounts"]["retained"], 0)
        self.assertGreater(recovered["generatedAt"], first["generatedAt"])

    def test_initial_failure_is_unavailable_and_categories_are_sanitized(self):
        def failure(_owner, repo, _timeout):
            if repo == "token.place":
                raise TimeoutError("token=do-not-publish")
            raise ValueError("raw response contents")

        payload = run_refresh(failure)
        self.assertEqual(payload["telemetry"]["state"], "unavailable")
        self.assertEqual(payload["telemetry"]["dataCompleteness"], "none")
        self.assertIsNone(payload["telemetry"]["lastSuccessfulRefreshAt"])
        self.assertEqual(payload["telemetry"]["failureCategories"]["timeout"], 1)
        self.assertEqual(payload["telemetry"]["failureCategories"]["invalid_response"], 1)
        self.assertEqual(payload["repos"], {})
        self.assertEqual(payload["errors"], {})
        self.assertNotIn("do-not-publish", json.dumps(payload))

    def test_repository_config_and_serialized_output_are_bounded(self):
        with tempfile.TemporaryDirectory() as directory:
            path = pathlib.Path(directory) / "repos.json"
            path.write_text(json.dumps(REPOS * 26), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "1-50"):
                cache.load_repos(path)
            path.write_text(json.dumps([{"owner": "bad/name", "repo": "repo"}]),
                            encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "owner is invalid"):
                cache.load_repos(path)
            with self.assertRaisesRegex(ValueError, "size limit"):
                cache.atomic_write_json(path, {"value": "x" * cache.MAX_OUTPUT_BYTES})

    def test_reading_published_telemetry_never_calls_fetch(self):
        calls = []
        payload = run_refresh(lambda *args: calls.append(args) or response())
        calls.clear()
        with tempfile.TemporaryDirectory() as directory:
            path = pathlib.Path(directory) / "github-metrics.json"
            cache.atomic_write_json(path, payload)
            loaded = cache.read_previous(path)
        self.assertEqual(loaded["telemetry"], payload["telemetry"])
        self.assertEqual(calls, [])


if __name__ == "__main__":
    unittest.main()
