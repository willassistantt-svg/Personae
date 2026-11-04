import { useRouter } from "next/router";
import { ChangeEvent, DragEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Trash } from "@phosphor-icons/react";
import { AdminShell } from "@/components/AdminShell";
import { Area, Field, GoldButton, LoadingBlock, Notice, SelectField } from "@/components/ui";
import { useGuard } from "@/hooks/useGuard";
import { ApiError, api } from "@/lib/api";
import { errorKey, useI18n } from "@/lib/i18n";
import type { Detail, Media } from "@/lib/types";
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

type PendingPhoto = { key: string; file: File; url: string };

function move<T>(items: T[], from: number, to: number): T[] {
  if (from === to || to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function ProfileFormContainer() {
  const session = useGuard(true);
  const { t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = typeof router.query.id === "string" ? router.query.id : "";
  const editing = router.pathname.includes("[id]");
  const queryKey = ["admin-profile", id];
  const existing = useQuery({
    queryKey,
    enabled: Boolean(editing && id && session.user?.role === "ADMIN"),
    queryFn: () => api<Detail>(`/api/admin/profiles/${id}?locale=pt`),
  });
  const [error, setError] = useState<string | null>(null);
  const [photoOrder, setPhotoOrder] = useState<Media[] | null>(null);
  const [pending, setPending] = useState<PendingPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;

  useEffect(() => () => pendingRef.current.forEach((item) => URL.revokeObjectURL(item.url)), []);

  const persona = existing.data;
  const savedPhotos = photoOrder ?? persona?.photos ?? [];

  function fail(caught: unknown) {
    setError(t(errorKey(caught instanceof ApiError ? caught.code : undefined)));
  }

  function refresh(detail: Detail) {
    queryClient.setQueryData(queryKey, detail);
    setPhotoOrder(null);
  }

  async function reorderSaved(from: number, to: number) {
    const next = move(savedPhotos, from, to);
    if (next === savedPhotos || busy) return;
    const previous = savedPhotos;
    setPhotoOrder(next);
    setBusy(true);
    setError(null);
    try {
      refresh(await api<Detail>(`/api/admin/profiles/${id}/photos/order`, { method: "PUT", body: { ids: next.map((item) => item.id) } }));
    } catch (caught) {
      setPhotoOrder(previous);
      fail(caught);
    } finally {
      setBusy(false);
    }
  }

  async function removeSaved(item: Media) {
    if (busy) return;
    if (item.kind === "PHOTO" && savedPhotos.length + pending.length <= 1) {
      setError(t("errors.photo"));
      return;
    }
    if (!window.confirm(t(item.kind === "PHOTO" ? "profiles.confirmPhoto" : "profiles.confirmVideo"))) return;
    setBusy(true);
    setError(null);
    try {
      refresh(await api<Detail>(`/api/admin/profiles/${id}/media/${item.id}`, { method: "DELETE" }));
    } catch (caught) {
      fail(caught);
    } finally {
      setBusy(false);
    }
  }

  function addPending(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).filter((file) => file.size > 0);
    event.target.value = "";
    setPending((current) => [
      ...current,
      ...files.map((file) => ({ key: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`, file, url: URL.createObjectURL(file) })),
    ]);
  }

  function removePending(item: PendingPhoto) {
    if (!window.confirm(t("profiles.confirmPhoto"))) return;
    URL.revokeObjectURL(item.url);
    setPending((current) => current.filter((value) => value.key !== item.key));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const issue = personaIssue({
      name: String(form.get("name") || ""),
      city: String(form.get("city") || ""),
      age: String(form.get("age") || ""),
      email: String(form.get("email") || ""),
      heightCm: String(form.get("heightCm") || ""),
      weightKg: String(form.get("weightKg") || ""),
      fee: String(form.get("fee") || ""),
      photoCount: pending.length + (editing ? savedPhotos.length : 0),
    });
    if (issue) {
      setError(t(issueKey[issue]));
      return;
    }
    const fee = String(form.get("fee") || "").trim();
    form.delete("fee");
    if (fee) form.set("priceCents", String(Math.round(Number(fee) * 100)));
    pending.forEach((item) => form.append("photos", item.file));
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
    setError(null);
    setBusy(true);
    try {
      const saved = await api<Detail>(editing ? `/api/admin/profiles/${id}` : "/api/admin/profiles", {
        method: editing ? "PUT" : "POST",
        form,
      });
      router.push(`/admin/profiles/${saved.id}`);
    } catch (caught) {
      fail(caught);
    } finally {
      setBusy(false);
    }
  }

  if (!session.user || session.user.role !== "ADMIN" || (editing && existing.isLoading)) {
    return <LoadingBlock label={t("common.loading")} />;
  }
  const required = (label: string) => `${label} *`;

  return (
    <AdminShell user={session.user} title={editing ? persona?.name || t("profiles.edit") : t("profiles.new")}>
      <h3 className="mb-8 break-words font-serif text-3xl italic sm:text-4xl">{editing ? persona?.name : t("profiles.new")}</h3>
      <form onSubmit={onSubmit} className="grid max-w-4xl gap-5" noValidate>
        {error ? <Notice>{error}</Notice> : null}
        <div>
          <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-zincMuted">{required(t("profiles.photos"))}</span>
          {savedPhotos.length > 0 || pending.length > 0 ? (
            <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {savedPhotos.map((item, index) => (
                <PhotoTile
                  key={item.id}
                  url={item.url}
                  index={index}
                  total={savedPhotos.length}
                  badge={index === 0 ? t("profiles.cover") : null}
                  disabled={busy}
                  onMove={reorderSaved}
                  onRemove={() => removeSaved(item)}
                  t={t}
                />
              ))}
              {pending.map((item, index) => (
                <PhotoTile
                  key={item.key}
                  url={item.url}
                  index={index}
                  total={pending.length}
                  badge={savedPhotos.length === 0 && index === 0 ? t("profiles.cover") : t("profiles.newPhoto")}
                  disabled={busy}
                  pending
                  onMove={(from, to) => setPending((current) => move(current, from, to))}
                  onRemove={() => removePending(item)}
                  t={t}
                />
              ))}
            </div>
          ) : null}
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addPending} className="text-xs text-zincMuted" />
          <span className="mt-2 block text-[11px] text-zincMuted">{t("profiles.photosHelp")}</span>
        </div>
        <div>
          <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-zincMuted">{t("profiles.video")}</span>
          {persona && persona.videos.length > 0 ? (
            <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {persona.videos.map((item) => (
                <div key={item.id} className="overflow-hidden rounded-2xl border border-hairline">
                  <video src={item.url} className="aspect-video w-full bg-black object-cover" muted playsInline preload="metadata" />
                  <div className="flex items-center justify-between gap-2 p-2">
                    <span className="truncate text-[10px] uppercase tracking-widest text-zincMuted">{item.label || t("profiles.video")}</span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => removeSaved(item)}
                      aria-label={t("profiles.removeMedia")}
                      title={t("profiles.removeMedia")}
                      className="rounded-full p-1.5 text-zincMuted transition hover:text-rose disabled:opacity-40"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                </div>
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
        <GoldButton className="w-full sm:w-fit" disabled={busy}>{t("profiles.save")}</GoldButton>
      </form>
    </AdminShell>
  );
}

function PhotoTile({
  url,
  index,
  total,
  badge,
  disabled,
  pending = false,
  onMove,
  onRemove,
  t,
}: {
  url: string;
  index: number;
  total: number;
  badge: string | null;
  disabled: boolean;
  pending?: boolean;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
  t: (key: string) => string;
}) {
  const group = pending ? "pending" : "saved";

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const [source, raw] = event.dataTransfer.getData("text/plain").split(":");
    const from = Number(raw);
    if (source === group && !Number.isNaN(from) && from !== index) onMove(from, index);
  }

  return (
    <div
      draggable={!disabled}
      onDragStart={(event) => event.dataTransfer.setData("text/plain", `${group}:${index}`)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      className={`group overflow-hidden rounded-2xl border ${pending ? "border-dashed border-champagne/60" : "border-hairline"} ${disabled ? "" : "cursor-grab"}`}
    >
      <div className="relative">
        <img src={url} alt="" className="aspect-[3/4] w-full object-cover" draggable={false} />
        {badge ? (
          <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-champagne">{badge}</span>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-1 p-2">
        <div className="flex gap-1">
          <button
            type="button"
            disabled={disabled || index === 0}
            onClick={() => onMove(index, index - 1)}
            aria-label={t("profiles.moveLeft")}
            title={t("profiles.moveLeft")}
            className="rounded-full p-1.5 text-zincMuted transition hover:text-champagne disabled:opacity-30"
          >
            <ArrowLeft size={14} />
          </button>
          <button
            type="button"
            disabled={disabled || index === total - 1}
            onClick={() => onMove(index, index + 1)}
            aria-label={t("profiles.moveRight")}
            title={t("profiles.moveRight")}
            className="rounded-full p-1.5 text-zincMuted transition hover:text-champagne disabled:opacity-30"
          >
            <ArrowRight size={14} />
          </button>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onRemove}
          aria-label={t("profiles.removeMedia")}
          title={t("profiles.removeMedia")}
          className="rounded-full p-1.5 text-zincMuted transition hover:text-rose disabled:opacity-40"
        >
          <Trash size={14} />
        </button>
      </div>
    </div>
  );
}
