// 暦日から月グリッド (月曜始まりの週の並び) を組み立てる純粋な日付計算。

import { isoDate, type IsoDate } from "@zunoser/utils";

const DAY_MS = 24 * 60 * 60 * 1000;
const toUtc = (date: IsoDate) => Date.parse(`${date}T00:00:00Z`);
const fromUtc = (ms: number) => isoDate(new Date(ms).toISOString().slice(0, 10));

/** 翌日 */
export const nextDay = (date: IsoDate) => fromUtc(toUtc(date) + DAY_MS);

/** 属する月 ("YYYY-MM") */
export const monthOf = (date: IsoDate) => date.slice(0, 7);

/** 翌月 ("YYYY-MM") */
export const nextMonth = (month: string) => {
  const mm = Number(month.slice(5, 7));
  return mm === 12 ? `${Number(month.slice(0, 4)) + 1}-01` : `${month.slice(0, 5)}${String(mm + 1).padStart(2, "0")}`;
};

/** 月内の全日を月曜始まりの週ごとに並べる。月外のセルは undefined */
export const monthWeeks = (month: string) => {
  const first = isoDate(`${month}-01`);
  const firstWeekday = (new Date(toUtc(first)).getUTCDay() + 6) % 7; // 月曜 = 0
  const weeks: (IsoDate | undefined)[][] = [];
  let week: (IsoDate | undefined)[] = Array.from({ length: firstWeekday }, () => undefined);
  for (let date = first; monthOf(date) === month; date = nextDay(date)) {
    week.push(date);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    weeks.push([...week, ...Array.from({ length: 7 - week.length }, () => undefined)]);
  }
  return weeks;
};
