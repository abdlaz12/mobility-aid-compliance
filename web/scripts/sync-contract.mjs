// Copies the shared detection event schema from the repo root into web/src/contracts.
import { copyFileSync } from "node:fs";
copyFileSync(
  new URL("../../contracts/detection-event.schema.json", import.meta.url),
  new URL("../src/contracts/detection-event.schema.json", import.meta.url),
);
console.log("contract synced");
