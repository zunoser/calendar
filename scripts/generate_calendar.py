#!/usr/bin/env python3
"""Generate an iCalendar file from a GitHub Projects v2 calendar."""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterable

API_URL = "https://api.github.com/graphql"

QUERY = """
query($organization: String!, $project: Int!, $cursor: String) {
  organization(login: $organization) {
    projectV2(number: $project) {
      title
      items(first: 100, after: $cursor) {
        nodes {
          updatedAt
          content {
            ... on Issue {
              number
              title
              url
              updatedAt
              repository { nameWithOwner }
            }
          }
          fieldValues(first: 50) {
            nodes {
              ... on ProjectV2ItemFieldDateValue {
                date
                field { ... on ProjectV2FieldCommon { name } }
              }
            }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
}
"""


@dataclass(frozen=True)
class Event:
    uid: str
    title: str
    url: str
    start: date
    end: date  # Inclusive.
    updated_at: datetime


def graphql(token: str, variables: dict[str, Any]) -> dict[str, Any]:
    request = urllib.request.Request(
        API_URL,
        data=json.dumps({"query": QUERY, "variables": variables}).encode(),
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "zunoser-calendar",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            result = json.load(response)
    except urllib.error.HTTPError as error:
        detail = error.read().decode(errors="replace")
        raise RuntimeError(
            f"GitHub API returned HTTP {error.code}: {detail}"
        ) from error
    except urllib.error.URLError as error:
        raise RuntimeError(f"GitHub API request failed: {error.reason}") from error

    if result.get("errors"):
        messages = "; ".join(
            error.get("message", "unknown error") for error in result["errors"]
        )
        raise RuntimeError(f"GitHub GraphQL error: {messages}")
    return result["data"]


def fetch_items(
    token: str, organization: str, project: int
) -> tuple[str, list[dict[str, Any]]]:
    cursor = None
    items: list[dict[str, Any]] = []
    title = "Calendar"

    while True:
        data = graphql(
            token,
            {"organization": organization, "project": project, "cursor": cursor},
        )
        project_data = data.get("organization", {}).get("projectV2")
        if project_data is None:
            raise RuntimeError(
                f"Project {organization}#{project} was not found or is not accessible"
            )
        title = project_data["title"]
        connection = project_data["items"]
        items.extend(connection["nodes"])
        page_info = connection["pageInfo"]
        if not page_info["hasNextPage"]:
            return title, items
        cursor = page_info["endCursor"]


def parse_date(value: Any) -> date | None:
    if not isinstance(value, str):
        return None
    try:
        parsed = date.fromisoformat(value)
    except ValueError:
        return None
    return parsed if value == parsed.isoformat() else None


def event_from_item(
    item: dict[str, Any], repository: str, start_field: str, end_field: str
) -> Event | None:
    issue = item.get("content")
    if not issue or issue.get("repository", {}).get("nameWithOwner") != repository:
        return None

    fields = {
        node.get("field", {}).get("name"): node.get("date")
        for node in item.get("fieldValues", {}).get("nodes", [])
        if node.get("field")
    }
    start = parse_date(fields.get(start_field))
    end = parse_date(fields.get(end_field))
    if start is None and end is None:
        return None
    if start is None:
        start = end
    if end is None:
        end = start
    assert start is not None and end is not None
    if end < start:
        print(
            f"warning: skipped {issue['url']}: {end_field} precedes {start_field}",
            file=sys.stderr,
        )
        return None

    updated_at = datetime.fromisoformat(
        item.get("updatedAt", issue["updatedAt"]).replace("Z", "+00:00")
    )
    return Event(
        f"{repository}#{issue['number']}",
        issue["title"],
        issue["url"],
        start,
        end,
        updated_at,
    )


def escape_text(value: str) -> str:
    return (
        value.replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\r\n", "\\n")
        .replace("\n", "\\n")
        .replace("\r", "\\n")
    )


def fold_line(line: str) -> list[str]:
    """Fold an iCalendar content line to at most 75 UTF-8 octets."""
    parts: list[str] = []
    current = ""
    limit = 75
    for character in line:
        if len((current + character).encode()) > limit:
            parts.append(current)
            current = " " + character
            limit = 75
        else:
            current += character
    parts.append(current)
    return parts


def render_calendar(name: str, events: Iterable[Event]) -> bytes:
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//zunoser//GitHub Project Calendar//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        f"X-WR-CALNAME:{escape_text(name)}",
    ]
    for event in sorted(events, key=lambda value: (value.start, value.end, value.uid)):
        timestamp = event.updated_at.astimezone(timezone.utc).strftime(
            "%Y%m%dT%H%M%SZ"
        )
        lines.extend(
            [
                "BEGIN:VEVENT",
                f"UID:{event.uid}@github.com",
                f"DTSTAMP:{timestamp}",
                f"LAST-MODIFIED:{timestamp}",
                f"DTSTART;VALUE=DATE:{event.start:%Y%m%d}",
                f"DTEND;VALUE=DATE:{event.end + timedelta(days=1):%Y%m%d}",
                f"SUMMARY:{escape_text(event.title)}",
                f"URL:{event.url}",
                "END:VEVENT",
            ]
        )
    lines.append("END:VCALENDAR")
    content = "\r\n".join(part for line in lines for part in fold_line(line))
    return (content + "\r\n").encode()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--organization", default="zunoser")
    parser.add_argument("--project", type=int, default=3)
    parser.add_argument("--repository", default="zunoser/calendar")
    parser.add_argument("--start-field", default="Start Date")
    parser.add_argument("--end-field", default="Target Date")
    parser.add_argument("--output", type=Path, default=Path("calendar.ics"))
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    token = os.environ.get("PROJECT_TOKEN")
    if not token:
        print("PROJECT_TOKEN is required", file=sys.stderr)
        return 2
    try:
        name, items = fetch_items(token, args.organization, args.project)
        events = [
            event
            for item in items
            if (
                event := event_from_item(
                    item, args.repository, args.start_field, args.end_field
                )
            )
            is not None
        ]
        content = render_calendar(name, events)
        args.output.write_bytes(content)
    except (OSError, RuntimeError, ValueError, KeyError, TypeError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
