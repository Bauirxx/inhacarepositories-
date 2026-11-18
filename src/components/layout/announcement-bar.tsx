import { Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSiteSettings } from "@/services/settings";

/** Aviso global configurável no painel administrativo. */
export async function AnnouncementBar() {
  let text = "";
  try {
    text = (await getSiteSettings(await createClient())).announcement;
  } catch {
    return null;
  }
  if (!text) return null;
  return (
    <div className="bg-sand text-ocean-deep">
      <p className="container-page flex items-center justify-center gap-2 py-2 text-center text-sm font-medium">
        <Megaphone className="size-4 shrink-0" aria-hidden />
        {text}
      </p>
    </div>
  );
}
