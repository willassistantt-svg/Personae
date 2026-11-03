import { useRouter } from "next/router";
import { FormEvent, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/AdminShell";
import { Area, Field, GoldButton, LoadingBlock, Notice, SelectField } from "@/components/ui";
import { useGuard } from "@/hooks/useGuard";
import { ApiError, api } from "@/lib/api";
import { errorKey, useI18n } from "@/lib/i18n";
import type { Detail } from "@/lib/types";
import { personaIssue } from "@/lib/validation";

const ethnicities = ["EUROPEAN", "MEDITERRANEAN", "LATIN_AMERICAN", "AFRICAN", "ASIAN", "MIDDLE_EASTERN", "MIXED", "OTHER"];
const issueKey = {
  name: "errors.validation",
  city: "errors.validation",
  age: "errors.personaAge",
  photo: "errors.photo",
  email: "errors.emailFormat",
  height: "errors.measure",
  weight: "errors.measure",
  fee: "errors.validation",
} as const;

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
    const photos = form.getAll("photos").filter((value) => value instanceof File && value.size > 0);
    const current = existing.data;
    const keptPhotos = (current?.photos.length ?? 0) - removeIds.filter((mediaId) => current?.photos.some((photo) => photo.id === mediaId)).length;
    const issue = personaIssue({
      name: String(form.get("name") || ""),
      city: String(form.get("city") || ""),
      age: String(form.get("age") || ""),
      email: String(form.get("email") || ""),
      heightCm: String(form.get("heightCm") || ""),
      weightKg: String(form.get("weightKg") || ""),
      fee: String(form.get("fee") || ""),
      photoCount: photos.length + (editing ? keptPhotos : 0),
    });
    if (issue) {
      setError(t(issueKey[issue]));
      return;
    }
    const fee = String(form.get("fee") || "").trim();
    form.delete("fee");
    if (fee) form.set("priceCents", String(Math.round(Number(fee) * 100)));
    form.delete("photos");
    photos.forEach((file) => form.append("photos", file));
    const video = form.get("video");
    if (!(video instanceof File) || video.size === 0) form.delete("video");
    for (const field of ["heightCm", "weightKg", "currency", "ethnicity"] as const) {
      if (!String(form.get(field) || "").trim()) form.delete(field);
    }
    form.set("name", String(form.get("name") || "").trim());
    form.set("city", String(form.get("city") || "").trim());
    form.set("description", String(form.get("description") || "").trim());
    form.set("email", String(form.get("email") || "").trim());
    form.set("sitePhone", String(form.get("sitePhone") || "").trim());
    form.set("phone", String(form.get("phone") || "").trim());
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
  const required = (label: string) => `${label} *`;

  return (
    <AdminShell user={session.user} title={editing ? persona?.name || t("profiles.edit") : t("profiles.new")}>
      <h3 className="mb-8 break-words font-serif text-3xl italic sm:text-4xl">{editing ? persona?.name : t("profiles.new")}</h3>
      <form onSubmit={onSubmit} className="grid max-w-4xl gap-5" noValidate>
        {error ? <Notice>{error}</Notice> : null}
        <div>
          <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-zincMuted">{required(t("profiles.photos"))}</span>
          {persona && persona.photos.length > 0 ? (
            <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {persona.photos.map((item) => (
                <label key={item.id} className={`overflow-hidden rounded-2xl border ${removeIds.includes(item.id) ? "border-rose" : "border-hairline"}`}>
                  <img src={item.url} alt="" className="h-28 w-full object-cover" />
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
          ) : null}
          <input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple className="text-xs text-zincMuted" />
          <span className="mt-2 block text-[11px] text-zincMuted">{t("profiles.photosHelp")}</span>
        </div>
        <div>
          <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-zincMuted">{t("profiles.video")}</span>
          {persona && persona.videos.length > 0 ? (
            <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {persona.videos.map((item) => (
                <label key={item.id} className={`overflow-hidden rounded-2xl border ${removeIds.includes(item.id) ? "border-rose" : "border-hairline"}`}>
                  <span className="block p-4 text-xs text-zincBright">{t("profiles.video")}</span>
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
          ) : null}
          <input name="video" type="file" accept="video/mp4,video/webm,video/quicktime" className="text-xs text-zincMuted" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={required(t("profiles.name"))} name="name" required defaultValue={persona?.name} />
          <Field label={required(t("detail.age"))} name="age" type="number" min={18} max={120} required defaultValue={persona?.age} />
        </div>
        <Field label={required(t("register.city"))} name="city" required defaultValue={persona?.city} />
        <Area label={t("profiles.description")} name="description" defaultValue={persona?.descriptionPt} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("profiles.phone1")} name="sitePhone" defaultValue={persona?.sitePhone || ""} />
          <Field label={t("profiles.phone2")} name="phone" defaultValue={persona?.phone || ""} />
        </div>
        <Field label={t("detail.email")} name="email" type="email" defaultValue={persona?.email || ""} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("profiles.fee")} name="fee" type="number" min={0} step="0.01" defaultValue={persona && persona.priceCents > 0 ? (persona.priceCents / 100).toFixed(2) : ""} />
          <SelectField label={t("profiles.currency")} name="currency" defaultValue={persona?.currency || ""}>
            <option value="" />
            <option>BRL</option>
            <option>EUR</option>
            <option>USD</option>
            <option>GBP</option>
          </SelectField>
        </div>
        <SelectField label={t("catalog.ethnicity")} name="ethnicity" defaultValue={persona?.ethnicity || ""}>
          <option value="" />
          {ethnicities.map((item) => (
            <option key={item} value={item}>{t(`ethnicity.${item}`)}</option>
          ))}
        </SelectField>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("catalog.height")} name="heightCm" type="number" min={120} max={230} defaultValue={persona && persona.heightCm > 0 ? persona.heightCm : ""} />
          <Field label={t("detail.weight")} name="weightKg" type="number" min={35} max={200} defaultValue={persona && persona.weightKg > 0 ? persona.weightKg : ""} />
        </div>
        <GoldButton className="w-full sm:w-fit">{t("profiles.save")}</GoldButton>
      </form>
    </AdminShell>
  );
}
