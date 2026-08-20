// サービス層。github の repository から取得した生の Issue をイベントへ変換しながらストリームで返す。

import { createGitHubGraphQL } from "@zunoser/calendar-github";
import { IsoDateSchema, type IsoDate } from "@zunoser/utils";
import { z } from "zod";
import type { Config } from "./config";

const DateFieldValuesSchema = z.object({
  value: IsoDateSchema,
  field: z.object({
    name: z.string().min(1),
  }),
});

const dateValuesByFieldName = (nodes: unknown[]) => {
  const dates = new Map<string, IsoDate>();
  for (const node of nodes) {
    const parsed = DateFieldValuesSchema.safeParse(node);
    if (parsed.success) {
      const { value, field } = parsed.data;
      dates.set(field.name, value);
    }
  }
  return dates;
};

const StringValueSchema = z.object({
  name: z.string(),
  field: z.object({
    name: z.string().min(1),
  }),
});

const stringValueByFieldName = (nodes: unknown[]) => {
  const values = new Map<string, string>();
  for (const node of nodes) {
    const parsed = StringValueSchema.safeParse(node);
    if (parsed.success) {
      const { name, field } = parsed.data;
      values.set(field.name, name);
    }
  }
  return values;
};

export const getGitHubCalendar = async (options: Config) => {
  const github = createGitHubGraphQL({
    token: options.token,
    userAgent: options.userAgent,
  });

  const statusField = await github.fetchSingleSelectField(options.repository, options.statusField.name);

  async function* getCalendar() {
    const issues = github.iterateIssues({
      repository: options.repository,
    });

    for await (const issue of issues) {
      const nodes = issue.issueFieldValues?.nodes ?? [];
      const dates = dateValuesByFieldName(nodes);
      const strings = stringValueByFieldName(nodes);

      yield {
        id: issue.id,
        title: issue.title,
        body: issue.body,
        url: issue.url,
        state: issue.state,
        labelColors: (issue.labels?.nodes ?? []).flatMap((label) => (label ? [label.color] : [])),
        assignees: (issue.assignees.nodes ?? []).flatMap((assignee) => (assignee === null ? [] : [assignee.login])),
        comments: (issue.comments.nodes ?? []).flatMap((comment) => (comment === null ? [] : [comment.body])),
        status: strings.get(options.statusField.name),
        startDate: dates.get(options.dateFields.start),
        endDate: dates.get(options.dateFields.end),
        updatedAt: issue.updatedAt,
      };
    }
  }

  /** Issue の Status フィールドを選択肢名で更新する */
  const updateStatus = async (issueId: string, status: string) => {
    const option = statusField.options.find(({ name }) => name === status);
    if (!option) {
      throw new Error(`Status option "${status}" not found`);
    }
    await github.setIssueStatus({
      issueId,
      fieldId: statusField.fieldId,
      optionId: option.id,
    });
  };

  return {
    getCalendar,
    updateStatus,
    closeIssue: github.closeIssue,
    addIssueComment: github.addIssueComment,
  };
};

type GitHubCalendar = Awaited<ReturnType<typeof getGitHubCalendar>>;
export type CalendarEvent = ReturnType<GitHubCalendar["getCalendar"]> extends AsyncGenerator<infer T> ? T : never;
