import { Temporal } from "@js-temporal/polyfill";
import { graphql } from "@octokit/graphql";
import ical, { ICalCalendarMethod } from "ical-generator";
import { z } from "zod";

const ORGANIZATION = "zunoser";
const PROJECT_NUMBER = 3;
const REPOSITORY = "zunoser/calendar";
const START_FIELD = "Start Date";
const END_FIELD = "Target Date";
const PAGE_SIZE = 100;

const query = `
  query CalendarProject(
    $organization: String!
    $project: Int!
    $startField: String!
    $endField: String!
    $cursor: String
  ) {
    organization(login: $organization) {
      projectV2(number: $project) {
        title
        items(first: ${PAGE_SIZE}, after: $cursor) {
          totalCount
          nodes {
            updatedAt
            content {
              __typename
              ... on Issue {
                number
                title
                url
                repository { nameWithOwner }
              }
            }
            startDate: fieldValueByName(name: $startField) {
              ... on ProjectV2ItemFieldDateValue { date }
            }
            endDate: fieldValueByName(name: $endField) {
              ... on ProjectV2ItemFieldDateValue { date }
            }
          }
          pageInfo { hasNextPage endCursor }
        }
      }
    }
  }
`;

const issueSchema = z.object({
  __typename: z.literal("Issue"),
  number: z.int().positive(),
  title: z.string(),
  url: z.url(),
  repository: z.object({ nameWithOwner: z.string() }),
});

const nonIssueSchema = z.object({
  __typename: z.enum(["DraftIssue", "PullRequest"]),
});

const itemSchema = z.object({
  updatedAt: z.iso.datetime({ offset: true }),
  content: z.discriminatedUnion("__typename", [issueSchema, nonIssueSchema]).nullable(),
  startDate: z.object({ date: z.unknown() }).nullable(),
  endDate: z.object({ date: z.unknown() }).nullable(),
});

const responseSchema = z.object({
  organization: z
    .object({
      projectV2: z
        .object({
          title: z.string(),
          items: z.object({
            totalCount: z.int().nonnegative(),
            nodes: z.array(itemSchema),
            pageInfo: z.object({
              hasNextPage: z.boolean(),
              endCursor: z.string().nullable(),
            }),
          }),
        })
        .nullable(),
    })
    .nullable(),
});

const githubDateSchema = z.iso
  .date()
  .transform((value) => Temporal.PlainDate.from(value));

const envSchema = z.object({ PROJECT_TOKEN: z.string().min(1) });

export type ProjectItem = z.infer<typeof itemSchema>;
export type GraphqlClient = (
  query: string,
  variables: Record<string, unknown>,
) => Promise<unknown>;

export interface CalendarEvent {
  uid: string;
  title: string;
  url: string;
  start: Temporal.PlainDate;
  end: Temporal.PlainDate;
  updatedAt: Temporal.Instant;
}

export async function fetchProject(client: GraphqlClient): Promise<{
  title: string;
  items: ProjectItem[];
}> {
  let cursor: string | null = null;
  let title = "calendar";
  let expectedCount: number | null = null;
  const items: ProjectItem[] = [];

  do {
    const response = responseSchema.parse(
      await client(query, {
        organization: ORGANIZATION,
        project: PROJECT_NUMBER,
        startField: START_FIELD,
        endField: END_FIELD,
        cursor,
      }),
    );
    const project = response.organization?.projectV2;
    if (!project) {
      throw new Error(
        `Project ${ORGANIZATION}#${PROJECT_NUMBER} was not found or is not accessible`,
      );
    }

    title = project.title;
    expectedCount = project.items.totalCount;
    items.push(...project.items.nodes);
    const pageInfo = project.items.pageInfo;
    if (pageInfo.hasNextPage && !pageInfo.endCursor) {
      throw new Error("GitHub returned a page without the required end cursor");
    }
    cursor = pageInfo.hasNextPage ? pageInfo.endCursor : null;
  } while (cursor);

  if (items.length !== expectedCount) {
    throw new Error(
      `Expected ${expectedCount} project items, received ${items.length}`,
    );
  }
  return { title, items };
}

export function toCalendarEvent(item: ProjectItem): CalendarEvent | null {
  const issue = item.content;
  if (
    !issue ||
    issue.__typename !== "Issue" ||
    issue.repository.nameWithOwner !== REPOSITORY
  ) {
    return null;
  }

  const parsedStart = githubDateSchema.safeParse(item.startDate?.date);
  const parsedEnd = githubDateSchema.safeParse(item.endDate?.date);
  let start = parsedStart.success ? parsedStart.data : null;
  let end = parsedEnd.success ? parsedEnd.data : null;
  if (!start && !end) return null;
  start ??= end;
  end ??= start;
  if (!start || !end) return null;

  if (Temporal.PlainDate.compare(end, start) < 0) {
    console.warn(`Skipped ${issue.url}: ${END_FIELD} precedes ${START_FIELD}`);
    return null;
  }

  return {
    uid: `${REPOSITORY}#${issue.number}@github.com`,
    title: issue.title,
    url: issue.url,
    start,
    end,
    updatedAt: Temporal.Instant.from(item.updatedAt),
  };
}

export function renderCalendar(name: string, events: CalendarEvent[]): string {
  const calendar = ical({
    name,
    prodId: {
      company: "zunoser",
      product: "GitHub Project Calendar",
      language: "EN",
    },
  });
  calendar.method(ICalCalendarMethod.PUBLISH);

  for (const event of events.toSorted((left, right) => {
    return (
      Temporal.PlainDate.compare(left.start, right.start) ||
      Temporal.PlainDate.compare(left.end, right.end) ||
      left.uid.localeCompare(right.uid)
    );
  })) {
    calendar.createEvent({
      id: event.uid,
      start: event.start,
      end: event.end.add({ days: 1 }),
      allDay: true,
      summary: event.title,
      url: event.url,
      stamp: event.updatedAt,
      lastModified: event.updatedAt,
    });
  }
  return calendar.toString();
}

export async function main(): Promise<void> {
  const { PROJECT_TOKEN } = envSchema.parse(process.env);
  const request = graphql.defaults({
    headers: { authorization: `token ${PROJECT_TOKEN}` },
  });
  const { title, items } = await fetchProject(request);
  const events = items
    .map(toCalendarEvent)
    .filter((event): event is CalendarEvent => event !== null);
  await Bun.write("calendar.ics", renderCalendar(title, events));
}

if (import.meta.main) {
  await main();
}
