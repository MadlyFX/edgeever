import { useEffect, useState } from "react";
import { NotebookText } from "lucide-react";
import { DEFAULT_BRANDING, useBranding } from "@/lib/branding";

export const BrandIdentity = () => {
  const branding = useBranding();
  const [failedUrl, setFailedUrl] = useState("");
  useEffect(() => setFailedUrl(""), [branding.logoUrl]);
  if (branding.name === DEFAULT_BRANDING.name && !branding.logoUrl && branding.color === DEFAULT_BRANDING.color) return null;
  return <div className="flex shrink-0 items-center gap-2 border-b px-4 py-3 text-sm font-semibold">
    {branding.logoUrl && failedUrl !== branding.logoUrl
      ? <img src={branding.logoUrl} referrerPolicy="no-referrer" alt="" className="h-7 w-7 object-contain" onError={() => setFailedUrl(branding.logoUrl)} />
      : <NotebookText className="h-6 w-6" style={{ color: branding.color }} />}
    <span className="truncate">{branding.name}</span>
  </div>;
};
