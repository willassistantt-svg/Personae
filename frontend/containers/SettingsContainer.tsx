import { FormEvent, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/AdminShell";
import { Field, GoldButton, LoadingBlock } from "@/components/ui";
import { useGuard } from "@/hooks/useGuard";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { House } from "@/lib/types";

export function SettingsContainer() {
  const session = useGuard(true);
  const { t } = useI18n();
  const client = useQueryClient();
  const [saved, setSaved] = useState(false);
  const house = useQuery({
    queryKey: ["settings"],
    enabled: session.user?.role === "ADMIN",
    queryFn: () => api<House>("/api/admin/settings"),
  });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaved(false);
    try {
      await api<House>("/api/admin/settings", {
        method: "PUT",
        body: { sitePhone: String(form.get("sitePhone") || ""), siteEmail: String(form.get("siteEmail") || "") },
      });
    } catch {
      return;
    }
    await client.invalidateQueries({ queryKey: ["settings"] });
    setSaved(true);
  }

  if (!session.user || session.user.role !== "ADMIN" || !house.data) return <LoadingBlock label={t("common.loading")} />;
  return (
    <AdminShell user={session.user} title={t("settings.title")}>
      <h3 className="font-serif text-3xl italic sm:text-4xl">{t("settings.title")}</h3>
      <p className="mb-8 mt-3 max-w-xl text-sm text-zincMuted">{t("settings.lead")}</p>
      <form onSubmit={onSubmit} className="grid max-w-xl gap-5">
        {saved ? <p className="rounded-2xl border border-champagne/40 bg-champagne/10 px-4 py-3 text-sm text-champagne">{t("settings.saved")}</p> : null}
        <Field label={t("settings.phone")} name="sitePhone" required defaultValue={house.data.sitePhone} />
        <Field label={t("settings.email")} name="siteEmail" type="email" required defaultValue={house.data.siteEmail} />
        <GoldButton className="w-full sm:w-fit">{t("settings.save")}</GoldButton>
      </form>
    </AdminShell>
  );
}
