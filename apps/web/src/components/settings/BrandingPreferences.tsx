import { useEffect, useId, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { NotebookText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { brandForeground, DEFAULT_BRANDING, normalizeBrandLogoUrl, resolveBranding, useBranding, writeBranding } from "@/lib/branding";

export const BrandingPreferences = () => {
  const { t } = useTranslation();
  const id = useId();
  const branding = useBranding();
  const [draft, setDraft] = useState(branding);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [failedLogo, setFailedLogo] = useState("");
  useEffect(() => { setDraft(branding); }, [branding]);
  const preview = resolveBranding(draft);
  const edit = (patch: Partial<typeof draft>) => {
    setDraft(current => ({ ...current, ...patch })); setError(""); setSaved(false);
  };
  const save = (event: FormEvent) => {
    event.preventDefault();
    if (draft.logoUrl.trim() && !normalizeBrandLogoUrl(draft.logoUrl)) {
      setError(t("settings.branding.invalidLogo", { defaultValue: "Use an HTTPS image URL, a local path, or an uploaded PNG, JPEG, or WebP." }));
      return;
    }
    try { writeBranding(draft); setSaved(true); setError(""); }
    catch { setError(t("settings.branding.saveError", { defaultValue: "Could not save branding on this device. Check that browser storage is available." })); }
  };
  const upload = async (file?: File) => {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 256 * 1024) {
      setError(t("settings.branding.fileError", { defaultValue: "Choose a PNG, JPEG, or WebP image up to 256 KB." })); return;
    }
    const reader = new FileReader();
    reader.onload = () => { setFailedLogo(""); edit({ logoUrl: String(reader.result) }); };
    reader.onerror = () => setError(t("settings.branding.fileError", { defaultValue: "Choose a PNG, JPEG, or WebP image up to 256 KB." }));
    reader.readAsDataURL(file);
  };
  return <form onSubmit={save} className="grid gap-4 px-4 py-4">
    <div>
      <h3 className="text-sm font-medium">{t("settings.branding.title", { defaultValue: "Branding" })}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{t("settings.branding.description", { defaultValue: "Personalize this app on this device. Your name, logo, and accent apply immediately after saving." })}</p>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1.5 text-sm" htmlFor={`${id}-name`}>
        {t("settings.branding.name", { defaultValue: "App name" })}
        <Input id={`${id}-name`} value={draft.name} maxLength={48} onChange={e => edit({ name: e.target.value })} />
      </label>
      <label className="grid gap-1.5 text-sm" htmlFor={`${id}-color`}>
        {t("settings.branding.color", { defaultValue: "Accent color" })}
        <Input id={`${id}-color`} className="h-9 w-20 cursor-pointer p-1" type="color" value={preview.color} onChange={e => edit({ color: e.target.value })} />
      </label>
      <label className="grid gap-1.5 text-sm sm:col-span-2" htmlFor={`${id}-logo`}>
        {t("settings.branding.logo", { defaultValue: "Logo URL" })}
        <Input id={`${id}-logo`} value={draft.logoUrl.startsWith("data:") ? "" : draft.logoUrl} placeholder="https://example.com/logo.png" onChange={e => edit({ logoUrl: e.target.value })} />
      </label>
      <label className="grid gap-1.5 text-sm sm:col-span-2" htmlFor={`${id}-file`}>
        {t("settings.branding.upload", { defaultValue: "Upload logo (up to 256 KB)" })}
        <Input id={`${id}-file`} type="file" accept="image/png,image/jpeg,image/webp" onChange={e => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
      </label>
    </div>
    <div className="flex items-center gap-3 rounded-lg border p-3">
      {preview.logoUrl && failedLogo !== preview.logoUrl
        ? <img src={preview.logoUrl} referrerPolicy="no-referrer" alt="" className="h-10 w-10 object-contain" onError={() => setFailedLogo(preview.logoUrl)} />
        : <NotebookText className="h-10 w-10" style={{ color: preview.color }} />}
      <span className="rounded-md px-3 py-1.5 text-sm font-medium" style={{ backgroundColor: preview.color, color: brandForeground(preview.color) }}>{preview.name}</span>
      {preview.logoUrl && <Button type="button" variant="ghost" size="sm" onClick={() => edit({ logoUrl: "" })}>{t("settings.branding.removeLogo", { defaultValue: "Remove logo" })}</Button>}
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {saved && <p role="status" className="text-sm text-muted-foreground">{t("settings.branding.saved", { defaultValue: "Branding saved." })}</p>}
    <div className="flex gap-2">
      <Button type="submit" size="sm">{t("common.save")}</Button>
      <Button type="button" variant="outline" size="sm" onClick={() => {
        try { writeBranding(DEFAULT_BRANDING); setSaved(true); setError(""); }
        catch { setError(t("settings.branding.saveError", { defaultValue: "Could not save branding on this device. Check that browser storage is available." })); }
      }}>{t("settings.branding.reset", { defaultValue: "Reset branding" })}</Button>
    </div>
  </form>;
};
