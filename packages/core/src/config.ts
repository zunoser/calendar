// 設定 (config.jsonc) のスキーマとパーサー。ファイル I/O は行わない (読み込みは CLI の責務)。

import { parse } from "jsonc-parser";
import { z } from "zod";

export const configSchema = z.strictObject({
  repository: z.strictObject({
    owner: z.string().min(1),
    name: z.string().min(1),
  }),
  token: z.string().prefault(process.env.TOKEN ?? ""),
  userAgent: z.string().min(1),
  issueType: z.string().min(1),
  dateFields: z.strictObject({
    start: z.string().min(1),
    end: z.string().min(1),
  }),
  statusField: z.strictObject({
    name: z.string().min(1),
    error: z.string().min(1),
    open: z.string().min(1),
  }),
});

export type Config = z.infer<typeof configSchema>;

/** JSONC テキストを検証済みの Config に変換する */
export const parseConfig = (text: string) => {
  const raw: unknown = parse(text);
  return configSchema.parse(raw);
};
