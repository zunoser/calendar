import { Temporal } from "@js-temporal/polyfill";
import { describe, expect, spyOn, test } from "bun:test";
import ICAL from "ical.js";
import {
  type GraphqlClient,
  type ProjectItem,
  fetchProject,
  renderCalendar,
  toCalendarEvent,
} from "../src/generate-calendar";

function item(
  start: unknown = null,
  end: unknown = null,
  repository = "zunoser/calendar",
): ProjectItem {
  return {
    updatedAt: "2026-08-19T02:03:04Z",
    content: {
      __typename: "Issue",
      number: 1,
      title: "Tokyo, day; one\\two",
      url: "https://github.com/zunoser/calendar/issues/1",
      repository: { nameWithOwner: repository },
    },
    startDate: start === null ? null : { date: start },
    endDate: end === null ? null : { date: end },
  };
}

describe("project pagination", () => {
  test("fetches every item across several pages", async () => {
    const total = 350;
    const calls: Array<string | null> = [];
    const client: GraphqlClient = async (_query, variables) => {
      const offset = variables.cursor ? Number(variables.cursor) : 0;
      calls.push((variables.cursor as string | null) ?? null);
      const count = Math.min(100, total - offset);
      return {
        organization: {
          projectV2: {
            title: "calendar",
            items: {
              totalCount: total,
              nodes: Array.from({ length: count }, () => item()),
              pageInfo: {
                hasNextPage: offset + count < total,
                endCursor: offset + count < total ? String(offset + count) : null,
              },
            },
          },
        },
      };
    };

    const project = await fetchProject(client);

    expect(project.items).toHaveLength(total);
    expect(calls).toEqual([null, "100", "200", "300"]);
  });

  test("rejects an inconsistent item count", async () => {
    const client: GraphqlClient = async () => ({
      organization: {
        projectV2: {
          title: "calendar",
          items: {
            totalCount: 2,
            nodes: [item()],
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        },
      },
    });

    expect(fetchProject(client)).rejects.toThrow("Expected 2 project items");
  });

  test("rejects malformed GitHub data", async () => {
    const client: GraphqlClient = async () => ({ organization: "invalid" });
    expect(fetchProject(client)).rejects.toThrow();
  });
});

describe("date handling", () => {
  test.each([null, "", "2026/08/19", "2026-8-19", "2026-02-30"])(
    "skips when neither date is valid: %p",
    (invalid) => {
      expect(toCalendarEvent(item(invalid, invalid))).toBeNull();
    },
  );

  test.each([
    ["2026-08-19", null],
    [null, "2026-08-19"],
    ["invalid", "2026-08-19"],
  ])("uses the only valid date for a one-day event", (start, end) => {
    const event = toCalendarEvent(item(start, end));
    expect(event?.start.toString()).toBe("2026-08-19");
    expect(event?.end.toString()).toBe("2026-08-19");
    expect(event?.uid).toBe("zunoser/calendar#1@github.com");
  });

  test("keeps an inclusive valid range", () => {
    const event = toCalendarEvent(item("2026-08-19", "2026-08-21"));
    expect(event?.start.toString()).toBe("2026-08-19");
    expect(event?.end.toString()).toBe("2026-08-21");
  });

  test("skips a reversed range", () => {
    const warning = spyOn(console, "warn").mockImplementation(() => undefined);
    expect(toCalendarEvent(item("2026-08-21", "2026-08-19"))).toBeNull();
    expect(warning).toHaveBeenCalledTimes(1);
    warning.mockRestore();
  });

  test("skips issues from another repository", () => {
    expect(toCalendarEvent(item("2026-08-19", null, "zunoser/other"))).toBeNull();
  });

  test("skips non-issue project items", () => {
    const draft = item("2026-08-19");
    draft.content = { __typename: "DraftIssue" };
    expect(toCalendarEvent(draft)).toBeNull();
  });
});

test("generates a standards-parseable all-day calendar", () => {
  const event = toCalendarEvent(item("2026-08-19", "2026-08-21"));
  if (!event) throw new Error("expected an event");
  event.title = "Tokyo, day; one\\two";
  event.updatedAt = Temporal.Instant.from("2026-08-19T02:03:04Z");

  const output = renderCalendar("calendar", [event]);
  const parsed = new ICAL.Component(ICAL.parse(output));
  const component = parsed.getFirstSubcomponent("vevent");
  if (!component) throw new Error("expected a VEVENT component");
  const parsedEvent = new ICAL.Event(component);

  expect(parsedEvent.startDate.toString()).toBe("2026-08-19");
  expect(parsedEvent.endDate.toString()).toBe("2026-08-22");
  expect(parsedEvent.summary).toBe("Tokyo, day; one\\two");
  expect(output.split("\r\n").every((line) => Buffer.byteLength(line) <= 75)).toBe(
    true,
  );
});
