import { useRouter } from "next/router";
import { FormEvent, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/AdminShell";
import { Area, Field, GoldButton, LoadingBlock, Notice, SelectField } from "@/components/ui";
import { useGuard } from "@/hooks/useGuard";
import { ApiError, api } from "@/lib/api";
import { errorKey, useI18n } from "@/lib/i18n";
import type { Detail } from "@/lib/types";

const ethnicities = ["EUROPEAN", "MEDITERRANEAN", "LATIN_AMERICAN", "AFRICAN", "ASIAN", "MIDDLE_EASTERN", "MIXED", "OTHER"];
const availabilities = ["AVAILABLE", "PRIVATE_REQUEST", "TRAVEL"];
const tiers = ["ELITE", "GOLD", "PRIVATE"];

export function ProfileFormContainer() {
  const session = useGuard(true);
  const { t } = useI18n();
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : "";
  const editing = router.pathname.includes("[id]");
  const existing = useQuery({
    queryKey: ["admin-profile", id],
    enabled: Boolean(editing && id && session.user?.role === "ADMIN"),
    queryFn: () => api<Detail>(`/api/admin/profiles/${id}?locale=pt`),
  });
  const [error, setError] = useState<string | null>(null);
  const [removeIds, setRemoveIds] = useState<string[]>([]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fee = Number(form.get("fee") || 0);
    form.delete("fee");
    form.set("priceCents", String(Math.round(fee * 100)));
    form.set("visible", form.get("visible") === "on" ? "true" : "false");
    removeIds.forEach((mediaId) => form.append("removeMediaIds", mediaId));
    setError(null);
    try {
      const saved = await api<Detail>(editing ? `/api/admin/profiles/${id}` : "/api/admin/profiles", {
        method: editing ? "PUT" : "POST",
        form,
      });
      router.push(`/admin/profiles/${saved.id}`);
    } catch (caught) {
      setError(t(errorKey(caught instanceof ApiError ? caught.code : undefined)));
    }
  }

  if (!session.user || session.user.role !== "ADMIN" || (editing && existing.isLoading)) {
    return <LoadingBlock label={t("common.loading")} />;
  }
  const persona = existing.data;

  return (
    <AdminShell user={session.user} title={editing ? persona?.name || t("profiles.edit") : t("profiles.new")}>
      <h3 className="mb-8 font-serif text-4xl italic">{editing ? persona?.name : t("profiles.new")}</h3>
      <form onSubmit={onSubmit} className="grid max-w-4xl gap-5">
        {error ? <Notice>{error}</Notice> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("profiles.name")} name="name" required defaultValue={persona?.name} />
          <Field label={t("detail.age")} name="age" type="number" min={18} required defaultValue={persona?.age ?? 25} />
        </div>
        <Field label={t("register.city")} name="city" required defaultValue={persona?.city} />
        <Area label={t("profiles.pt")} name="descriptionPt" required defaultValue={persona?.descriptionPt} />
        <Area label={t("profiles.en")} name="descriptionEn" required defaultValue={persona?.descriptionEn} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("detail.email")} name="email" type="email" required defaultValue={persona?.email} />
          <Field label={t("detail.profilePhone")} name="phone" required defaultValue={persona?.phone} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t("profiles.fee")} name="fee" type="number" min={0} step="0.01" required defaultValue={persona ? (persona.priceCents / 100).toFixed(2) : "0"} />
          <SelectField label="Currency" name="currency" defaultValue={persona?.currency || "BRL"}>
            <option>BRL</option>
            <option>EUR</option>
            <option>USD</option>
            <option>GBP</option>
          </SelectField>
          <SelectField label={t("catalog.ethnicity")} name="ethnicity" defaultValue={persona?.ethnicity || "EUROPEAN"}>
            {ethnicities.map((item) => (
              <option key={item} value={item}>{t(`ethnicity.${item}`)}</option>
            ))}
          </SelectField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("catalog.height")} name="heightCm" type="number" min={120} max={230} required defaultValue={persona?.heightCm ?? 170} />
          <Field label={t("detail.weight")} name="weightKg" type="number" min={35} max={200} required defaultValue={persona?.weightKg ?? 55} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t("detail.hair")} name="hair" defaultValue={persona?.hair || ""} />
          <Field label={t("detail.eyes")} name="eyes" defaultValue={persona?.eyes || ""} />
          <Field label={t("detail.languages")} name="languages" defaultValue={persona?.languages || ""} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label={t("detail.availability")} name="availability" defaultValue={persona?.availability || "AVAILABLE"}>
            {availabilities.map((item) => (
              <option key={item} value={item}>{t(`status.${item}`)}</option>
            ))}
          </SelectField>
          <SelectField label={t("catalog.status")} name="tier" defaultValue={persona?.tier || "ELITE"}>
            {tiers.map((item) => (
              <option key={item} value={item}>{t(`tier.${item}`)}</option>
            ))}
          </SelectField>
        </div>
        <label className="flex items-center gap-3 text-sm text-zincMuted">
          <input name="visible" type="checkbox" defaultChecked={persona?.visible ?? true} className="accent-champagne" />
          {t("profiles.visible")}
        </label>
        {persona ? (
          <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-zincMuted">{t("profiles.keep")}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[...persona.photos, ...persona.videos].map((item) => (
                <label key={item.id} className={`overflow-hidden rounded-2xl border ${removeIds.includes(item.id) ? "border-rose" : "border-hairline"}`}>
                  {item.kind === "PHOTO" ? <img src={item.url} alt="" className="h-28 w-full object-cover" /> : <span className="block p-4 text-xs">{item.label || "Film"}</span>}
                  <span className="flex items-center gap-2 p-2 text-[10px] uppercase tracking-widest text-zincMuted">
                    <input
                      type="checkbox"
                      checked={removeIds.includes(item.id)}
                      onChange={(event) =>
                        setRemoveIds((current) => (event.target.checked ? [...current, item.id] : current.filter((value) => value !== item.id)))
                      }
                    />
                    {t("profiles.removeMedia")}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ) : null}
        <label className="block">
          <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-zincMuted">{t("profiles.photos")}</span>
          <input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple required={!editing} className="text-xs text-zincMuted" />
          <span className="mt-2 block text-[11px] text-zincMuted">{t("profiles.photosHelp")}</span>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-zincMuted">{t("profiles.video")}</span>
            <input name="video" type="file" accept="video/mp4,video/webm,video/quicktime" className="text-xs text-zincMuted" />
          </label>
          <Field label={t("profiles.videoLabel")} name="videoLabel" />
        </div>
        <GoldButton className="w-fit">{t("profiles.save")}</GoldButton>
      </form>
    </AdminShell>
  );
}
