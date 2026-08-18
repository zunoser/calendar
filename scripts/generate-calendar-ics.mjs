import { writeFile } from "node:fs/promises";

const API_URL = "https://api.github.com";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function fieldValue(body, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const inline = new RegExp(
    `^\\s*(?:[-*]\\s*)?\\`?${escapedName}\\`?\\s*(?::|：|\\|)\\s*(.*?)\\s*$`,
    "im",
  ).exec(body);
  if (inline) return inline[1];

  // GitHub Issue Forms render text inputs as a heading followed by its value.
  const heading = new RegExp(
    `^#{1,6}\\s*${escapedName}\\s*$\\r?\\n(?:\\s*\\r?\\n)*\\s*([^\\r\\n]+)`,
    "im",
  ).exec(body);
  return heading?.[1] ?? "";
}

function parseDate(value) {
  const text = value.trim();
  if (!text) return null;

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (dateOnly) {
    const [year, month, day] = dateOnly.slice(1).map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    ) {
      return date;
    }
    return null;
  }

  const timestamp = Date.parse(text);
  return Number.isNaN(timestamp) ? null : new Date(timestamp);
}

function formatDate(date) {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

function addDays(date, days) {
  return new Date(date.getTime() + days * ONE_DAY_MS);
}

function escapeIcs(value) {
  return String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replace(/\r?\n/g, "\\n");
}

function eventForIssue(issue) {
  const body = issue.body ?? "";
  const start = parseDate(fieldValue(body, "startdate"));
  const end = parseDate(fieldValue(body, "enddate"));

  // With one usable date, or an inverted date range, create a one-day event.
  // A range uses an exclusive DTEND, so its stated end date is included.
  const first = start ?? end;
  if (!first) return null;
  const last = start && end && end >= start ? end : first;

  return {
    start: first,
    lines: [
      "BEGIN:VEVENT",
      `UID:github-issue-${issue.id}@github.com`,
      `DTSTAMP:${new Date(issue.updated_at).toISOString().replace(/[-:]/g, "").replace(".000", "")}`,
      `DTSTART;VALUE=DATE:${formatDate(first)}`,
      `DTEND;VALUE=DATE:${formatDate(addDays(last, 1))}`,
      `SUMMARY:${escapeIcs(issue.title)}`,
      `URL:${issue.html_url}`,
      `DESCRIPTION:${escapeIcs(`GitHub Issue #${issue.number}: ${issue.html_url}`)}`,
      "END:VEVENT",
    ],
  };
}

async function getIssues(repository, token) {
  const issues = [];
  for (let page = 1; ; page += 1) {
    const response = await fetch(
      `${API_URL}/repos/${repository}/issues?state=all&per_page=100&page=${page}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );
    if (!response.ok) throw new Error(`GitHub API request failed: ${response.status} ${await response.text()}`);

    const pageIssues = await response.json();
    // The Issues API also returns pull requests; they are not calendar issues.
    issues.push(...pageIssues.filter((issue) => !issue.pull_request));
    if (pageIssues.length < 100) return issues;
  }
}

const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
if (!repository || !token) throw new Error("GITHUB_REPOSITORY and GITHUB_TOKEN are required");

const events = (await getIssues(repository, token))
  .map(eventForIssue)
  .filter(Boolean)
  .sort((a, b) => a.start - b.start || a.lines[5].localeCompare(b.lines[5]));

const calendar = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "PRODID:-//zunoser/calendar//GitHub Issues//JA",
  "CALSCALE:GREGORIAN",
  ...events.flatMap((event) => event.lines),
  "END:VCALENDAR",
  "",
].join("\r\n");

await writeFile("calendar.ics", calendar);
console.log(`Generated calendar.ics with ${events.length} event(s).`);
