import { useEffect, useState } from "react";

export type BrandingPreference = { name: string; logoUrl: string; color: string };
export const BRANDING_STORAGE_KEY = "edgeever.branding";
const BRANDING_CHANGED_EVENT = "edgeever:branding-changed";
export const DEFAULT_BRANDING: BrandingPreference = { name: "EdgeEver", logoUrl: "", color: "#1ba456" };

export const normalizeBrandLogoUrl = (value: unknown): string => {
  if (typeof value !== "string") return "";
  const url = value.trim();
  if (/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(url) && url.length <= 350_000) return url;
  if (!url || /[\u0000-\u0020\\"'<>]/.test(url)) return "";
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password ? parsed.href : "";
  } catch { return ""; }
};

export const resolveBranding = (value: unknown): BrandingPreference => {
  const input = value && typeof value === "object" ? value as Partial<BrandingPreference> : {};
  const name = typeof input.name === "string"
    ? Array.from(input.name.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim()).slice(0, 48).join("")
    : "";
  let color = typeof input.color === "string" ? input.color.trim().toLowerCase() : "";
  if (/^#[a-f0-9]{3}$/.test(color)) color = `#${[...color.slice(1)].map(c => c + c).join("")}`;
  return { name: name || DEFAULT_BRANDING.name, logoUrl: normalizeBrandLogoUrl(input.logoUrl), color: /^#[a-f0-9]{6}$/.test(color) ? color : DEFAULT_BRANDING.color };
};

export const getBranding = (): BrandingPreference => {
  try { return resolveBranding(JSON.parse(window.localStorage.getItem(BRANDING_STORAGE_KEY) || "null")); }
  catch { return { ...DEFAULT_BRANDING }; }
};

// Let storage failures reach the form instead of claiming an unsaved change persisted.
export const writeBranding = (value: BrandingPreference): BrandingPreference => {
  const next = resolveBranding(value);
  window.localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(BRANDING_CHANGED_EVENT));
  return next;
};

export const useBranding = (): BrandingPreference => {
  const [branding, setBranding] = useState(getBranding);
  useEffect(() => {
    const sync = () => setBranding(getBranding());
    sync();
    window.addEventListener(BRANDING_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(BRANDING_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return branding;
};

export const brandForeground = (hex: string): string => {
  const [r, g, b] = [1, 3, 5].map(offset => {
    const channel = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.179 ? "#000000" : "#FFFFFF";
};

export const withAppBrandName = (text: string, name = getBranding().name) => text.replaceAll("EdgeEver", () => name);

export const replaceBrandTitle = (title: string, previousName: string, nextName: string): string => {
  if (title === previousName) return nextName;
  const environmentPrefix = title.match(/^\[(?:DEV|DEMO|LOCAL|LOCAL DEMO)\] /)?.[0];
  if (environmentPrefix && title.slice(environmentPrefix.length) === previousName) return environmentPrefix + nextName;
  const suffix = ` · ${previousName}`;
  return title.endsWith(suffix) ? title.slice(0, -suffix.length) + ` · ${nextName}` : title;
};

export const installBrandingPreferences = () => {
  let previousName = DEFAULT_BRANDING.name;
  const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  const defaultFavicon = favicon?.getAttribute("href") || "/favicon.svg";
  const theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  const defaultTheme = theme?.content || "#0f172a";
  const apply = () => {
    const branding = getBranding();
    document.title = replaceBrandTitle(document.title, previousName, branding.name);
    previousName = branding.name;
    if (favicon) {
      favicon.href = branding.logoUrl || defaultFavicon;
      favicon.removeAttribute("type");
    }
    if (theme) theme.content = branding.color === DEFAULT_BRANDING.color ? defaultTheme : branding.color;
    const channels = [1, 3, 5].map(offset => Number.parseInt(branding.color.slice(offset, offset + 2), 16));
    document.documentElement.style.setProperty("--brand-green-rgb", channels.join(" "));
  };
  apply();
  window.addEventListener(BRANDING_CHANGED_EVENT, apply);
  window.addEventListener("storage", apply);
  return () => {
    window.removeEventListener(BRANDING_CHANGED_EVENT, apply);
    window.removeEventListener("storage", apply);
  };
};

