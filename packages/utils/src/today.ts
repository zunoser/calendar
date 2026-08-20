// 実行時点の「今日」。カレンダーの基準日は日本時間で決める。

import { isoDate } from "./iso-date";

/** 日本時間での今日の暦日を返す */
export const todayInTokyo = () =>
  isoDate(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(new Date()));
