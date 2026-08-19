// 設定 (config.jsonc) のスキーマとパーサー。ファイル I/O は行わない (読み込みは CLI の責務)。

import { parse } from "jsonc-parser";
import { z } from "zod";

export const configSchema = z.strictObject({
  project: z.strictObject({
    org: z.string().min(1),
    number: z.int().positive(),
  }),
  token: z.string().prefault(process.env.TOKEN ?? ""),
  userAgent: z.string().min(1),
  dateFields: z.strictObject({
    start: z.string().min(1),
    end: z.string().min(1),
  }),
  statusField: z.strictObject({
    error: z.string().min(1),
    done: z.string().min(1),
    open: z.string().min(1),
  }),
});

export type Config = z.infer<typeof configSchema>;

/** JSONC テキストを検証済みの Config に変換する */
export const parseConfig = (text: string) => {
  const raw: unknown = parse(text);
  return configSchema.parse(raw);
};
