// readme コマンド。READMEのタグ内の画像参照を差し替える。

import { defineCommand } from "citty";
import { readFile, writeFile } from "node:fs/promises";

export const readme = defineCommand({
  meta: { name: "readme", description: "READMEのタグ内の画像参照を差し替える" },
  args: {
    path: { type: "positional", required: true, description: "参照させる画像のパス (READMEからの相対)" },
    alt: { type: "string", default: "calendar", description: "画像の代替テキスト" },
    tag: { type: "string", required: true, description: "差し替え先タグ名 (zunocal:<tag>)" },
    readme: { type: "string", default: "README.md", description: "更新するREADMEのパス" },
  },
  async run({ args }) {
    const startTag = `<!-- zunocal:${args.tag}:start -->`;
    const endTag = `<!-- zunocal:${args.tag}:end -->`;

    const source = await readFile(args.readme, "utf8");
    const start = source.indexOf(startTag);
    const end = source.indexOf(endTag, start);
    if (start === -1 || end === -1) throw new Error(`READMEにzunocal:${args.tag}タグがありません`);

    const block = `${startTag}\n![${args.alt}](${args.path})\n${endTag}`;
    await writeFile(args.readme, source.slice(0, start) + block + source.slice(end + endTag.length), "utf8");
    console.log(`updated ${args.readme} (zunocal:${args.tag})`);
  },
});
