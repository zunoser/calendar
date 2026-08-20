// 週の中でイベントが占める列範囲の算出と、重ならないためのレーン割り当て。

import type { IsoDate } from "@zunoser/utils";

interface DatedEvent {
  startDate: IsoDate;
  /** この日を含む */
  endDate: IsoDate;
}

export interface WeekBar<E extends DatedEvent> {
  event: E;
  /** 週内の開始列 (月曜 = 0) */
  startCol: number;
  /** 占める列数 */
  span: number;
  /** 同じ週で重なるイベントを縦に積むための段 (上から 0) */
  lane: number;
}

/** 週 (7セル、月外は undefined) にかかるイベントを帯に変換する */
export const weekBars = <E extends DatedEvent>(
  week: readonly (IsoDate | undefined)[],
  events: readonly E[],
): WeekBar<E>[] => {
  const bars = events
    .flatMap((event) => {
      const cols = week.flatMap((date, col) =>
        date !== undefined && event.startDate <= date && date <= event.endDate ? [col] : [],
      );
      return cols.length === 0 ? [] : [{ event, startCol: cols[0]!, span: cols.length }];
    })
    .toSorted((a, b) => a.startCol - b.startCol || b.span - a.span);

  const laneEnds: number[] = []; // レーンごとの使用済み末尾列
  return bars.map((bar) => {
    const free = laneEnds.findIndex((end) => end < bar.startCol);
    const lane = free === -1 ? laneEnds.length : free;
    laneEnds[lane] = bar.startCol + bar.span - 1;
    return { ...bar, lane };
  });
};
