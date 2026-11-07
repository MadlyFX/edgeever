import { afterEach, describe, expect, test } from "bun:test";
import { BRANDING_STORAGE_KEY, DEFAULT_BRANDING, brandForeground, getBranding, installBrandingPreferences, normalizeBrandLogoUrl, replaceBrandTitle, resolveBranding, writeBranding } from "./branding.ts";

const originalWindow = globalThis.window;
const originalDocument = globalThis.document;
afterEach(() => { globalThis.window = originalWindow; globalThis.document = originalDocument; });

const storageWindow = () => {
  const values = new Map();
  const target = new EventTarget();
  target.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  globalThis.window = target;
  return target;
};

describe("personal branding", () => {
  test("corrupt or unavailable storage falls back without breaking startup", () => {
    const target = storageWindow();
    target.localStorage.setItem(BRANDING_STORAGE_KEY, "{broken");
    expect(getBranding()).toEqual(DEFAULT_BRANDING);
    target.localStorage.getItem = () => { throw new Error("blocked"); };
    expect(getBranding()).toEqual(DEFAULT_BRANDING);
    expect(resolveBranding({ name: " \n Team  Notes ", color: "#abc" })).toMatchObject({ name: "Team Notes", color: "#aabbcc" });
    expect(resolveBranding({ name: "x".repeat(100), color: "url(evil)" }).name.length).toBe(48);
  });
  test("unsafe logo protocols and credentials are rejected", () => {
    for (const url of ["javascript:alert(1)", "http://example.com/a.png", "//example.com/a.png", "https://u:p@example.com/a", "/\\evil.png", "data:image/svg+xml;base64,PHN2Zz4="]) {
      expect(normalizeBrandLogoUrl(url)).toBe("");
    }
    for (const url of ["https://example.com/a.png", "/branding/a.png", "data:image/png;base64,YQ=="]) expect(normalizeBrandLogoUrl(url)).toBe(url);
    expect(normalizeBrandLogoUrl(`data:image/png;base64,${"A".repeat(350001)}`)).toBe("");
  });
  test("saving survives rereads, reset restores defaults, and quota errors do not report success", () => {
    const target = storageWindow();
    let changes = 0;
    target.addEventListener("edgeever:branding-changed", () => changes++);
    const custom = { name: "My Notes", color: "#ffffff", logoUrl: "https://example.com/a.png" };
    writeBranding(custom);
    expect(getBranding()).toEqual(custom);
    writeBranding(DEFAULT_BRANDING);
    expect(getBranding()).toEqual(DEFAULT_BRANDING);
    target.localStorage.setItem = () => { throw new Error("quota"); };
    expect(() => writeBranding(custom)).toThrow("quota");
    expect(changes).toBe(2);
  });
  test("saving and storage events update title, icon, and accent without touching note titles", () => {
    const target = storageWindow();
    const favicon = { href: "/favicon.svg", getAttribute: () => "/favicon.svg", removeAttribute() {} };
    const theme = { content: "#0f172a" };
    const style = new Map();
    globalThis.document = { title: "EdgeEver", querySelector: selector => selector.includes('rel="icon"') ? favicon : theme, documentElement: { style: { setProperty: (key, value) => style.set(key, value) } } };
    const cleanup = installBrandingPreferences();
    writeBranding({ name: "My EdgeEver", color: "#ffffff", logoUrl: "https://example.com/a.png" });
    expect(document.title).toBe("My EdgeEver");
    expect(favicon.href).toBe("https://example.com/a.png");
    expect(style.get("--brand-green-rgb")).toBe("255 255 255");
    target.localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify({ ...DEFAULT_BRANDING, name: "Another" }));
    target.dispatchEvent(new Event("storage"));
    expect(document.title).toBe("Another");
    expect(favicon.href).toBe("/favicon.svg");
    expect(replaceBrandTitle("A note about EdgeEver · Another", "Another", "New")).toBe("A note about EdgeEver · New");
    expect(replaceBrandTitle("[DEV] EdgeEver", "EdgeEver", "My Notes")).toBe("[DEV] My Notes");
    cleanup();
  });
  test("accent button text remains readable on light and dark colors", () => {
    expect(brandForeground("#ffffff")).toBe("#07130B");
    expect(brandForeground("#000000")).toBe("#FFFFFF");
  });
});
