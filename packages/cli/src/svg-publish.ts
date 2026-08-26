import { defineCommand } from "citty";
import { publishSvgAssets } from "./svg-assets";

export const svgPublish = defineCommand({
  meta: { name: "publish", description: "SVGをハッシュ名へ置き換えてREADMEの参照を更新する" },
  args: {
    current: { type: "string", required: true, description: "今月のSVGパス" },
    next: { type: "string", required: true, description: "来月のSVGパス" },
    readme: { type: "string", required: true, description: "更新するREADMEのパス" },
    "dry-run": { type: "boolean", default: false, description: "ファイルを変更せず結果を表示する" },
  },
  async run({ args }) {
    const result = await publishSvgAssets({
      currentPath: args.current,
      nextPath: args.next,
      readmePath: args.readme,
      dryRun: args["dry-run"],
    });
    const action = args["dry-run"] ? "would publish" : "published";
    for (const path of result.outputPaths) console.log(`${action} ${path}`);
    const removeAction = args["dry-run"] ? "would remove" : "removed";
    for (const path of result.removedPaths) console.log(`${removeAction} ${path}`);
    console.log(`${args["dry-run"] ? "would update" : "updated"} ${args.readme}`);
  },
});
