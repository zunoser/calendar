import { defineCommand } from "citty";
import { svgPublish } from "./svg-publish";
import { svgRender } from "./svg-render";

export const svg = defineCommand({
  meta: { name: "svg", description: "カレンダーSVGを生成・公開する" },
  subCommands: { render: svgRender, publish: svgPublish },
});
