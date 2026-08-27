import { defineCommand, runMain } from "citty";
import { check } from "./check";
import { close } from "./close";
import { ics } from "./ics";
import { readme } from "./readme";
import { remind } from "./remind";
import { svg } from "./svg";
import { view } from "./view";

const main = defineCommand({
  meta: {
    name: "zunocal",
    description: "GitHub Project のカレンダー CLI",
  },
  subCommands: { check, close, ics, readme, remind, svg, view },
});

await runMain(main);
