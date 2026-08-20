// 月グリッドのカレンダー SVG 生成。GitHub の README に <img> で埋め込む前提で、
// 配色は内蔵 CSS の prefers-color-scheme でライト/ダーク両対応にする。

import type { IsoDate } from "@zunoser/utils";
import { weekBars } from "./lane";
import { monthWeeks } from "./month";

export interface SvgEvent {
  title: string;
  startDate: IsoDate;
  /** この日を含む */
  endDate: IsoDate;
}

const CELL_W = 128;
const MARGIN = 8;
const WIDTH = CELL_W * 7 + MARGIN * 2;
const TITLE_H = 30;
const HEADER_H = 22;
const DAY_H = 22;
const LANE_H = 20;
const BAR_H = 16;
const WEEK_PAD = 4;
const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];

const STYLE = `
  text { font-family: -apple-system, "Segoe UI", "Hiragino Sans", "Noto Sans JP", Meiryo, sans-serif; font-size: 12px; fill: #1f2328; }
  .title { font-size: 15px; font-weight: 600; }
  .cell { fill: none; stroke: #808080; stroke-opacity: 0.4; }
  .out { fill: #808080; fill-opacity: 0.1; stroke: #808080; stroke-opacity: 0.4; }
  .sat { fill: #0969da; }
  .sun { fill: #cf222e; }
  .bar { fill: #1f6feb; }
  .bar-text { font-size: 11px; fill: #ffffff; }
  @media (prefers-color-scheme: dark) {
    text { fill: #e6edf3; }
    .sat { fill: #4493f8; }
    .sun { fill: #f85149; }
  }
`;

const escapeXml = (text: string) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

const weekdayClass = (col: number) => (col === 5 ? ' class="sat"' : col === 6 ? ' class="sun"' : "");

const monthTitle = (month: string) => `${Number(month.slice(0, 4))}年${Number(month.slice(5, 7))}月`;

// 1か月分を描画し、消費した高さと要素を返す
const renderMonth = (month: string, events: readonly SvgEvent[], top: number) => {
  const parts: string[] = [];
  parts.push(`<text x="${MARGIN}" y="${top + 20}" class="title">${monthTitle(month)}</text>`);
  for (const [col, label] of WEEKDAYS.entries()) {
    const x = MARGIN + col * CELL_W + CELL_W / 2;
    parts.push(`<text x="${x}" y="${top + TITLE_H + 15}" text-anchor="middle"${weekdayClass(col)}>${label}</text>`);
  }

  let y = top + TITLE_H + HEADER_H;
  for (const week of monthWeeks(month)) {
    const bars = weekBars(week, events);
    const lanes = bars.reduce((max, bar) => Math.max(max, bar.lane + 1), 1);
    const weekHeight = DAY_H + lanes * LANE_H + WEEK_PAD;

    for (const [col, date] of week.entries()) {
      const x = MARGIN + col * CELL_W;
      parts.push(
        `<rect x="${x}" y="${y}" width="${CELL_W}" height="${weekHeight}" class="${date === undefined ? "out" : "cell"}"/>`,
      );
      if (date !== undefined) {
        parts.push(`<text x="${x + 6}" y="${y + 16}"${weekdayClass(col)}>${Number(date.slice(8, 10))}</text>`);
      }
    }
    for (const bar of bars) {
      const x = MARGIN + bar.startCol * CELL_W + 2;
      const width = bar.span * CELL_W - 4;
      const barY = y + DAY_H + bar.lane * LANE_H;
      // 入れ子の <svg> で帯からはみ出すタイトルを切り落とす
      parts.push(
        `<svg x="${x}" y="${barY}" width="${width}" height="${BAR_H}">` +
          `<rect width="${width}" height="${BAR_H}" rx="4" class="bar"/>` +
          `<text x="6" y="12" class="bar-text">${escapeXml(bar.event.title)}</text>` +
          `</svg>`,
      );
    }
    y += weekHeight;
  }
  return { height: y - top, parts };
};

/** イベント一覧から、指定した月 ("YYYY-MM") の月グリッド SVG を生成する */
export const toSvg = (events: readonly SvgEvent[], month: string) => {
  const { height, parts } = renderMonth(month, events, MARGIN);
  const total = height + MARGIN * 2;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${total}" viewBox="0 0 ${WIDTH} ${total}" role="img" aria-label="カレンダー ${monthTitle(month)}">`,
    `<style>${STYLE}</style>`,
    ...parts,
    `</svg>`,
    ``,
  ].join("\n");
};
