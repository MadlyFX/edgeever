import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { extractFile } from "@electron/asar";
import { shouldConfigureDesktopUpdates } from "../apps/desktop/src/main/desktop-update-policy.mjs";

const resources = "release/desktop/win-unpacked/resources";
const metadata = JSON.parse(extractFile(`${resources}/app.asar`, "package.json").toString());
assert.equal(metadata.edgeeverUpdatePolicy, "manual", "Fork build must disable automatic updates");
assert.equal(shouldConfigureDesktopUpdates({ packaged: true, updatePolicy: metadata.edgeeverUpdatePolicy }), false);
assert.equal(existsSync(`${resources}/app-update.yml`), false, "Fork must not bundle the official update feed");
console.log("Fork package has manual updates and no official update feed.");
