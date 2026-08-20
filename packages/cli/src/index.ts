import { defineCommand, runMain } from "citty";
import { check } from "./check";
import { close } from "./close";
import { ics } from "./ics";
import { svg } from "./svg";
import { view } from "./view";

const main = defineCommand({
  meta: {
    name: "zunocal",
    description: "GitHub Project のカレンダー CLI",
  },
  subCommands: { check, close, ics, svg, view },
});

await runMain(main);
