#!/usr/bin/env python3
"""Publish a bounded, unauthenticated GitHub repository cache."""

import datetime as dt
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

API_ROOT = "https://api.github.com/repos"
SOURCE = "github-api"
USER_AGENT = "danielsmith.io-github-metrics-cache"
MAX_REPOS = 50
MAX_DURATION_MS = 300_000
MAX_OUTPUT_BYTES = 256 * 1024
NAME_PATTERN = re.compile(r"^[A-Za-z0-9_.-]{1,100}$")
FAILURE_CATEGORIES = (
    "rate_limited",
    "not_found",
    "timeout",
    "network",
    "upstream",
    "invalid_response",
)


def utc_now():
    return dt.datetime.now(dt.timezone.utc)


def isoformat(timestamp):
    return timestamp.isoformat(timespec="milliseconds").replace("+00:00", "Z")


def read_int_env(name, default):
    try:
        value = int(os.environ.get(name, ""))
    except ValueError:
        return default
    return value if value > 0 else default


def load_repos(path):
    with open(path, "r", encoding="utf-8") as handle:
        repos = json.load(handle)
    if not isinstance(repos, list) or not 1 <= len(repos) <= MAX_REPOS:
        raise ValueError(f"repos config must contain 1-{MAX_REPOS} entries")
    normalized = []
    seen = set()
    for item in repos:
        if not isinstance(item, dict):
            raise ValueError("each repo config entry must be an object")
        owner = item.get("owner")
        repo = item.get("repo")
        if not isinstance(owner, str) or not NAME_PATTERN.fullmatch(owner):
            raise ValueError("repo owner is invalid")
        if not isinstance(repo, str) or not NAME_PATTERN.fullmatch(repo):
            raise ValueError("repo name is invalid")
        key = f"{owner.lower()}/{repo.lower()}"
        if key in seen:
            raise ValueError("repo config contains a duplicate")
        seen.add(key)
        normalized.append({"owner": owner, "repo": repo})
    return normalized


def fetch_repo(owner, repo, timeout):
    request = urllib.request.Request(
        f"{API_ROOT}/{owner}/{repo}",
        headers={
            "Accept": "application/vnd.github+json",
            "User-Agent": USER_AGENT,
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def failure_category(exc):
    status = getattr(exc, "code", None)
    if status in (403, 429):
        return "rate_limited"
    if status == 404:
        return "not_found"
    if isinstance(exc, (TimeoutError,)) or "timed out" in str(exc).lower():
        return "timeout"
    if isinstance(exc, urllib.error.URLError):
        return "network"
    if isinstance(exc, urllib.error.HTTPError):
        return "upstream"
    return "invalid_response"


def bounded_number(value):
    return min(max(int(value or 0), 0), 2_147_483_647)


def repo_record(owner, repo, fetched_at, data):
    if not isinstance(data, dict):
        raise ValueError("GitHub response is not an object")
    return {
        "owner": owner,
        "repo": repo,
        "stars": bounded_number(data.get("stargazers_count")),
        "subscribers": bounded_number(data.get("subscribers_count")),
        "watchers": bounded_number(data.get("subscribers_count", data.get("watchers_count"))),
        "forks": bounded_number(data.get("forks_count")),
        "openIssues": bounded_number(data.get("open_issues_count")),
        "pushedAt": data.get("pushed_at") if isinstance(data.get("pushed_at"), str) else None,
        "fetchedAt": fetched_at,
        "htmlUrl": f"https://github.com/{owner}/{repo}",
    }


def empty_categories():
    return {category: 0 for category in FAILURE_CATEGORIES}


def read_previous(path):
    try:
        with open(path, "r", encoding="utf-8") as handle:
            payload = json.load(handle)
        if payload.get("schemaVersion") != 2 or not isinstance(payload.get("repos"), dict):
            return None
        return payload
    except (OSError, ValueError, AttributeError):
        return None


def warmup_payload(configured, now_fn=utc_now):
    attempted_at = isoformat(now_fn())
    return {
        "schemaVersion": 2,
        "generatedAt": attempted_at,
        "expiresAt": attempted_at,
        "source": "github-api-warmup",
        "repos": {},
        "errors": {},
        "telemetry": {
            "cacheEnabled": True,
            "state": "warmup",
            "lastAttemptAt": None,
            "lastSuccessfulRefreshAt": None,
            "dataGeneratedAt": None,
            "dataCompleteness": "none",
            "refreshDurationMs": 0,
            "repositoryCounts": {
                "configured": configured,
                "successful": 0,
                "failed": 0,
                "retained": 0,
            },
            "failureCategories": empty_categories(),
        },
    }


def refresh(repos, timeout, cache_ttl, previous=None, deadline=None, now_fn=utc_now,
            monotonic_fn=time.monotonic, fetch_fn=fetch_repo):
    started = monotonic_fn()
    attempted_at = now_fn()
    fetched_at = isoformat(attempted_at)
    previous_repos = previous.get("repos", {}) if previous else {}
    output_repos = {}
    categories = empty_categories()
    successful = failed = retained = 0

    for item in repos:
        owner, repo = item["owner"], item["repo"]
        key = f"{owner.lower()}/{repo.lower()}"
        try:
            request_timeout = timeout
            if deadline is not None:
                remaining = deadline - monotonic_fn()
                if remaining <= 0:
                    raise TimeoutError("startup deadline elapsed")
                request_timeout = min(timeout, remaining)
            output_repos[key] = repo_record(
                owner, repo, fetched_at, fetch_fn(owner, repo, request_timeout)
            )
            successful += 1
        except Exception as exc:  # failures are deliberately reduced to a fixed category set
            category = failure_category(exc)
            categories[category] += 1
            failed += 1
            old = previous_repos.get(key)
            if isinstance(old, dict):
                output_repos[key] = old
                retained += 1

    if failed == 0:
        state, completeness = "fresh", "complete"
    elif output_repos:
        state, completeness = "stale-fallback", "partial"
    else:
        state, completeness = "unavailable", "none"

    fetched_times = [
        record.get("fetchedAt") for record in output_repos.values()
        if isinstance(record.get("fetchedAt"), str)
    ]
    data_generated_at = min(fetched_times) if fetched_times else None
    data_generated_time = (
        dt.datetime.fromisoformat(data_generated_at.replace("Z", "+00:00"))
        if data_generated_at else attempted_at
    )
    last_success = fetched_at if successful else (
        previous.get("telemetry", {}).get("lastSuccessfulRefreshAt") if previous else None
    )
    duration_ms = min(max(round((monotonic_fn() - started) * 1000), 0), MAX_DURATION_MS)
    telemetry = {
        "cacheEnabled": True,
        "state": state,
        "lastAttemptAt": fetched_at,
        "lastSuccessfulRefreshAt": last_success,
        "dataGeneratedAt": data_generated_at,
        "dataCompleteness": completeness,
        "refreshDurationMs": duration_ms,
        "repositoryCounts": {
            "configured": len(repos),
            "successful": successful,
            "failed": failed,
            "retained": retained,
        },
        "failureCategories": categories,
    }
    return {
        "schemaVersion": 2,
        "generatedAt": data_generated_at or fetched_at,
        "expiresAt": isoformat(data_generated_time + dt.timedelta(seconds=cache_ttl)),
        "source": SOURCE if output_repos else "github-api-unavailable",
        "repos": output_repos,
        "errors": {},
        "telemetry": telemetry,
    }


def atomic_write_json(path, payload):
    encoded = (json.dumps(payload, indent=2, sort_keys=True) + "\n").encode("utf-8")
    if len(encoded) > MAX_OUTPUT_BYTES:
        raise ValueError("serialized cache exceeds size limit")
    directory = os.path.dirname(path)
    os.makedirs(directory, exist_ok=True)
    temp_path = f"{path}.tmp.{os.getpid()}"
    with open(temp_path, "wb") as handle:
        handle.write(encoded)
    os.replace(temp_path, path)


def log(message):
    print(f"[github-metrics] {message}", flush=True)


def main():
    repos_path = os.environ.get("GITHUB_METRICS_REPOS_PATH", "/etc/github-metrics/repos.json")
    output_path = os.environ.get("GITHUB_METRICS_OUTPUT_PATH", "/cache/github-metrics.json")
    refresh_interval = read_int_env("GITHUB_METRICS_REFRESH_INTERVAL_SECONDS", 3600)
    request_timeout = read_int_env("GITHUB_METRICS_REQUEST_TIMEOUT_SECONDS", 5)
    startup_timeout = read_int_env("GITHUB_METRICS_STARTUP_TIMEOUT_SECONDS", 20)
    cache_ttl = read_int_env("GITHUB_METRICS_CACHE_TTL_SECONDS", 4500)
    repos = load_repos(repos_path)
    if read_previous(output_path) is None:
        atomic_write_json(output_path, warmup_payload(len(repos)))
    first_refresh = True
    while True:
        started = time.monotonic()
        deadline = started + startup_timeout if first_refresh else None
        previous = read_previous(output_path)
        payload = refresh(repos, request_timeout, cache_ttl, previous, deadline)
        atomic_write_json(output_path, payload)
        counts = payload["telemetry"]["repositoryCounts"]
        log(f"refresh state={payload['telemetry']['state']} ok={counts['successful']} "
            f"failed={counts['failed']} retained={counts['retained']}")
        first_refresh = False
        time.sleep(max(refresh_interval - (time.monotonic() - started), 1))


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(0)
