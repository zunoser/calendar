// サービス層。github の repository から取得した生アイテムをイベントへ変換しながらストリームで返す。

import { createGitHubGraphQL } from "@zunoser/calendar-github";
import { IsoDateSchema, type IsoDate } from "@zunoser/utils";
import { z } from "zod";
import type { Config } from "./config";

const DateFieldValuesSchema = z.object({
  date: IsoDateSchema,
  field: z.object({
    name: z.string().min(1),
  }),
});

const dateValuesByFieldName = (nodes: unknown[]) => {
  const dates = new Map<string, IsoDate>();
  for (const node of nodes) {
    const parsed = DateFieldValuesSchema.safeParse(node);
    if (parsed.success) {
      const { date, field } = parsed.data;
      dates.set(field.name, date);
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

  const statusField = await github.fetchStatusField(options.project);

  async function* getCalendar() {
    const items = github.iterateProjectItems({
      project: options.project,
    });

    for await (const item of items) {
      const content = item.content;
      if (!content) continue;
      if (content.__typename !== "Issue") continue;
      const dates = dateValuesByFieldName(item.fieldValues.nodes ?? []);
      const strings = stringValueByFieldName(item.fieldValues.nodes ?? []);

      yield {
        id: item.id,
        issueId: content.id,
        title: content.title,
        body: content.body,
        url: content.url,
        state: content.state,
        labelColors: (content.labels?.nodes ?? []).flatMap((label) => (label ? [label.color] : [])),
        status: strings.get("Status"),
        startDate: dates.get(options.dateFields.start),
        endDate: dates.get(options.dateFields.end),
        updatedAt: item.updatedAt,
      };
    }
  }

  /** アイテムの Status を選択肢名で更新する */
  const updateStatus = async (itemId: string, status: string) => {
    const option = statusField.options.find(({ name }) => name === status);
    if (!option) {
      throw new Error(`Status option "${status}" not found`);
    }
    await github.updateItemStatus({
      projectId: statusField.projectId,
      itemId,
      fieldId: statusField.fieldId,
      optionId: option.id,
    });
  };

  return {
    getCalendar,
    updateStatus,
    closeIssue: github.closeIssue,
  };
};

type GitHubCalendar = Awaited<ReturnType<typeof getGitHubCalendar>>;
export type CalendarEvent = ReturnType<GitHubCalendar["getCalendar"]> extends AsyncGenerator<infer T> ? T : never;
