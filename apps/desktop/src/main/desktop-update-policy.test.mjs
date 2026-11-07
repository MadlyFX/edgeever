import { describe, expect, test } from "bun:test";
import { shouldConfigureDesktopUpdates } from "./desktop-update-policy.mjs";

describe("desktop update policy", () => {
  test("existing packaged releases keep automatic updates", () => {
    expect(shouldConfigureDesktopUpdates({ packaged: true })).toBe(true);
  });
  test("fork packages cannot start the official updater, even when packaged", () => {
    expect(shouldConfigureDesktopUpdates({ packaged: true, updatePolicy: "manual" })).toBe(false);
  });
  test("development and the existing opt-out keep updates disabled", () => {
    expect(shouldConfigureDesktopUpdates({ packaged: false })).toBe(false);
    expect(shouldConfigureDesktopUpdates({ packaged: true, disabled: "1" })).toBe(false);
  });
});
