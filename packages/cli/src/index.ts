import { defineCommand, runMain } from "citty";
import { check } from "./check";
import { close } from "./close";
import { ics } from "./ics";
import { view } from "./view";

const main = defineCommand({
  meta: {
    name: "zunocal",
    description: "GitHub Project のカレンダー CLI",
  },
  subCommands: { check, close, ics, view },
});

await runMain(main);
