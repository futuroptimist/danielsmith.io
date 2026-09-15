#!/usr/bin/env python3
"""Publish bounded GitHub cache data and refresh telemetry as static JSON."""

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
NAME_PATTERN = re.compile(r"^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,98}[A-Za-z0-9])?$")
FAILURE_CATEGORIES = {
    "configuration",
    "internal",
    "invalid_response",
    "network",
    "not_found",
    "rate_limited",
    "timeout",
    "upstream",
}


def utc_now():
    return dt.datetime.now(dt.timezone.utc)


def isoformat(timestamp):
    return timestamp.isoformat(timespec="milliseconds").replace("+00:00", "Z")


def parse_timestamp(value):
    if not isinstance(value, str):
        return None
    try:
        return dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def read_int_env(name, default):
    try:
        parsed = int(os.environ.get(name, ""))
    except ValueError:
        return default
    return parsed if parsed > 0 else default


def load_repos(path):
    with open(path, "r", encoding="utf-8") as handle:
        repos = json.load(handle)
    if not isinstance(repos, list) or not 1 <= len(repos) <= MAX_REPOS:
        raise ValueError(f"repos config must contain 1-{MAX_REPOS} repositories")
    normalized = []
    seen = set()
    for item in repos:
        if not isinstance(item, dict):
            raise ValueError("each repository must be an object")
        owner = item.get("owner")
        repo = item.get("repo")
        if not isinstance(owner, str) or not isinstance(repo, str):
            raise ValueError("repository owner and repo must be strings")
        if not NAME_PATTERN.fullmatch(owner) or not NAME_PATTERN.fullmatch(repo):
            raise ValueError("repository owner or repo is invalid")
        key = f"{owner.lower()}/{repo.lower()}"
        if key in seen:
            raise ValueError("repository configuration contains a duplicate")
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
    if isinstance(status, int):
        return "upstream"
    if isinstance(exc, (TimeoutError,)):
        return "timeout"
    if isinstance(exc, urllib.error.URLError):
        return "timeout" if isinstance(exc.reason, TimeoutError) else "network"
    if isinstance(exc, (json.JSONDecodeError, UnicodeDecodeError, ValueError, TypeError)):
        return "invalid_response"
    if isinstance(exc, OSError):
        return "network"
    return "internal"


def bounded_count(value):
    return max(0, min(int(value), MAX_REPOS))


def bounded_number(value):
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        return 0
    return max(0, min(int(value), 2_147_483_647))


def repo_record(owner, repo, fetched_at, data):
    if not isinstance(data, dict):
        raise ValueError("GitHub response must be an object")
    pushed_at = data.get("pushed_at")
    html_url = data.get("html_url")
    expected_url = f"https://github.com/{owner}/{repo}"
    return {
        "owner": owner,
        "repo": repo,
        "stars": bounded_number(data.get("stargazers_count", 0)),
        "subscribers": bounded_number(data.get("subscribers_count", 0)),
        "watchers": bounded_number(
            data.get("subscribers_count", data.get("watchers_count", 0))
        ),
        "forks": bounded_number(data.get("forks_count", 0)),
        "openIssues": bounded_number(data.get("open_issues_count", 0)),
        "pushedAt": pushed_at if parse_timestamp(pushed_at) else None,
        "fetchedAt": fetched_at,
        "htmlUrl": html_url if html_url == expected_url else expected_url,
    }


def load_previous(path, configured_keys):
    try:
        with open(path, "r", encoding="utf-8") as handle:
            payload = json.load(handle)
    except (OSError, json.JSONDecodeError):
        return {}, None
    repos = payload.get("repos") if isinstance(payload, dict) else None
    if not isinstance(repos, dict):
        return {}, None
    retained = {}
    for key, value in list(repos.items())[:MAX_REPOS]:
        if key not in configured_keys or not isinstance(value, dict):
            continue
        fetched_at = parse_timestamp(value.get("fetchedAt"))
        if fetched_at is None:
            continue
        retained[key] = value
    telemetry = payload.get("cache") if isinstance(payload.get("cache"), dict) else {}
    last_success = telemetry.get("lastSuccessfulRefreshAt")
    return retained, last_success if parse_timestamp(last_success) else None


def make_payload(repos, cache_ttl, now, duration_ms, categories, counts, last_success):
    timestamps = [parse_timestamp(item.get("fetchedAt")) for item in repos.values()]
    timestamps = [value for value in timestamps if value is not None]
    oldest = min(timestamps) if timestamps else None
    generated_at = oldest or now
    failed = counts["failed"]
    retained = counts["retained"]
    successful = counts["successful"]
    if failed == 0 and successful == counts["configured"]:
        state = "fresh"
        completeness = "complete"
    elif repos:
        state = "stale"
        completeness = "partial"
    else:
        state = "unavailable"
        completeness = "none"
    age_seconds = max(0, int((now - oldest).total_seconds())) if oldest else None
    safe_categories = sorted(set(categories).intersection(FAILURE_CATEGORIES))
    return {
        "schemaVersion": 2,
        "generatedAt": isoformat(generated_at),
        "expiresAt": isoformat(generated_at + dt.timedelta(seconds=cache_ttl)),
        "source": SOURCE if repos else "github-api-unavailable",
        "repos": dict(list(sorted(repos.items()))[:MAX_REPOS]),
        "errors": {},
        "cache": {
            "enabled": True,
            "state": state,
            "lastSuccessfulRefreshAt": last_success,
            "dataCompleteness": completeness,
            "refreshDurationMs": max(0, min(int(duration_ms), 3_600_000)),
            "failureCategories": safe_categories,
            "configuredRepositoryCount": bounded_count(counts["configured"]),
            "successfulRepositoryCount": bounded_count(successful),
            "failedRepositoryCount": bounded_count(failed),
            "retainedRepositoryCount": bounded_count(retained),
            "oldestDataFetchedAt": isoformat(oldest) if oldest else None,
            "retainedDataAgeSeconds": (
                min(age_seconds, 31_536_000) if age_seconds is not None else None
            ),
        },
    }


def atomic_write_json(path, payload):
    directory = os.path.dirname(path)
    os.makedirs(directory, exist_ok=True)
    temp_path = f"{path}.tmp.{os.getpid()}"
    with open(temp_path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2, sort_keys=True)
        handle.write("\n")
    os.replace(temp_path, path)


def warming_payload(configured_count):
    return {
        "schemaVersion": 2,
        "generatedAt": None,
        "expiresAt": None,
        "source": "github-api-warming",
        "repos": {},
        "errors": {},
        "cache": {
            "enabled": True,
            "state": "warming",
            "lastSuccessfulRefreshAt": None,
            "dataCompleteness": "none",
            "refreshDurationMs": None,
            "failureCategories": [],
            "configuredRepositoryCount": bounded_count(configured_count),
            "successfulRepositoryCount": 0,
            "failedRepositoryCount": 0,
            "retainedRepositoryCount": 0,
            "oldestDataFetchedAt": None,
            "retainedDataAgeSeconds": None,
        },
    }


def refresh_once(repos, output_path, timeout, cache_ttl, deadline=None, fetcher=fetch_repo):
    started = time.monotonic()
    now = utc_now()
    fetched_at = isoformat(now)
    keys = {f"{item['owner'].lower()}/{item['repo'].lower()}" for item in repos}
    previous, previous_success = load_previous(output_path, keys)
    current = dict(previous)
    successful = 0
    failed = 0
    retained = 0
    categories = []
    for item in repos:
        owner, repo = item["owner"], item["repo"]
        key = f"{owner.lower()}/{repo.lower()}"
        remaining_timeout = timeout
        if deadline is not None:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                failed += 1
                retained += int(key in previous)
                categories.append("timeout")
                continue
            remaining_timeout = min(timeout, remaining)
        try:
            data = fetcher(owner, repo, remaining_timeout)
            current[key] = repo_record(owner, repo, fetched_at, data)
            successful += 1
        except Exception as exc:  # Every upstream failure is reduced to a bounded category.
            failed += 1
            retained += int(key in previous)
            categories.append(failure_category(exc))
    last_success = fetched_at if successful > 0 else previous_success
    counts = {
        "configured": len(repos),
        "successful": successful,
        "failed": failed,
        "retained": retained,
    }
    payload = make_payload(
        current,
        cache_ttl,
        now,
        (time.monotonic() - started) * 1000,
        categories,
        counts,
        last_success,
    )
    atomic_write_json(output_path, payload)
    return payload


def log(message):
    print(f"[github-metrics] {message}", flush=True)


def main():
    repos_path = os.environ.get(
        "GITHUB_METRICS_REPOS_PATH", "/etc/github-metrics/repos.json"
    )
    output_path = os.environ.get("GITHUB_METRICS_OUTPUT_PATH", "/cache/github-metrics.json")
    refresh_interval = read_int_env("GITHUB_METRICS_REFRESH_INTERVAL_SECONDS", 3600)
    request_timeout = read_int_env("GITHUB_METRICS_REQUEST_TIMEOUT_SECONDS", 5)
    startup_timeout = read_int_env("GITHUB_METRICS_STARTUP_TIMEOUT_SECONDS", 20)
    cache_ttl = read_int_env("GITHUB_METRICS_CACHE_TTL_SECONDS", 4500)
    repos = load_repos(repos_path)
    configured_keys = {f"{item['owner'].lower()}/{item['repo'].lower()}" for item in repos}
    retained, _last_success = load_previous(output_path, configured_keys)
    if not retained:
        atomic_write_json(output_path, warming_payload(len(repos)))
    first_refresh = True
    while True:
        started = time.monotonic()
        deadline = started + startup_timeout if first_refresh else None
        payload = refresh_once(repos, output_path, request_timeout, cache_ttl, deadline)
        cache = payload["cache"]
        log(
            f"refresh state={cache['state']} ok={cache['successfulRepositoryCount']} "
            f"failed={cache['failedRepositoryCount']} retained={cache['retainedRepositoryCount']}"
        )
        first_refresh = False
        time.sleep(max(refresh_interval - (time.monotonic() - started), 1))


if __name__ == "__main__":
    try:
        main()
    except (KeyboardInterrupt, ValueError) as exc:
        log(f"stopped: {type(exc).__name__}")
        sys.exit(0 if isinstance(exc, KeyboardInterrupt) else 1)
