// ISO 8601 の暦日 (YYYY-MM-DD)。文字列のまま辞書順で比較・ソートすると時系列順になる。

import { z } from "zod";

export const IsoDateSchema = z.iso.date().brand<"IsoDate">();
export type IsoDate = z.infer<typeof IsoDateSchema>;

/** 文字列を検証して IsoDate にする */
export const isoDate = (value: string) => IsoDateSchema.parse(value);
