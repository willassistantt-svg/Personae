import { FormEvent, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { Field, GoldButton, LoadingBlock, Notice, QuietButton } from "@/components/ui";
import { useGuard } from "@/hooks/useGuard";
import { ApiError, api } from "@/lib/api";
import { errorKey, useI18n } from "@/lib/i18n";
import { isAdult } from "@/lib/validation";
import type { Issued } from "@/lib/types";

export function MemberCreateContainer() {
  const session = useGuard(true);
  const { t, locale } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<Issued | null>(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!isAdult(String(form.get("birthDate") || ""))) {
      setError(t("errors.underage"));
      return;
    }
    if (form.get("contactAuthorized") !== "on") {
      setError(t("errors.contact"));
      return;
    }
    form.set("contactAuthorized", "true");
    form.set("locale", locale);
    form.set("sendEmail", form.get("sendEmail") === "on" ? "true" : "false");
    setError(null);
    try {
      const result = await api<Issued>("/api/admin/members", { method: "POST", form });
      setIssued(result);
    } catch (caught) {
      setError(t(errorKey(caught instanceof ApiError ? caught.code : undefined)));
    }
  }

  if (!session.user || session.user.role !== "ADMIN") return <LoadingBlock label={t("common.loading")} />;

  return (
    <AdminShell user={session.user} title={t("members.directTitle")}>
      <h3 className="break-words font-serif text-3xl italic sm:text-4xl">{t("members.directTitle")}</h3>
      <p className="mb-8 mt-3 max-w-2xl text-sm text-zincMuted">{t("members.directLead")}</p>
      {issued ? (
        <div className="max-w-2xl rounded-[1.5rem] border border-hairline bg-charcoal p-5 sm:rounded-[2rem] sm:p-8">
          <p className="mb-4 text-sm text-zincBright">{t("members.created")}</p>
          <input readOnly value={issued.link} className="w-full min-w-0 rounded-2xl border border-hairline bg-graphite px-4 py-3 text-base" />
          <QuietButton
            type="button"
            className="mt-4"
            onClick={async () => {
              await navigator.clipboard.writeText(issued.link);
              setCopied(true);
            }}
          >
            {copied ? t("members.copied") : t("members.copy")}
          </QuietButton>
          <p className="mt-3 text-xs text-zincMuted">{issued.emailStatus}</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="grid max-w-3xl gap-5">
          {error ? <Notice>{error}</Notice> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("register.first")} name="firstName" required />
            <Field label={t("register.last")} name="lastName" required />
          </div>
          <Field label={t("login.email")} name="email" type="email" required />
          <Field label={t("register.birth")} name="birthDate" type="date" required />
          <Field label={t("register.phone")} name="phone" required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("register.city")} name="city" required />
            <Field label={t("register.state")} name="state" required />
          </div>
          <Field label={t("register.country")} name="country" required defaultValue="Brasil" />
          <Field label={t("register.travel")} name="travelLocations" hint={t("register.travelHint")} />
          <label className="flex items-start gap-3 text-sm text-zincMuted">
            <input name="contactAuthorized" type="checkbox" className="mt-1 accent-champagne" />
            {t("register.contact")}
          </label>
          <label className="flex items-start gap-3 text-sm text-zincMuted">
            <input name="sendEmail" type="checkbox" defaultChecked className="mt-1 accent-champagne" />
            {t("members.send")}
          </label>
          <label className="block">
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-zincMuted">{t("register.document")}</span>
            <input name="document" type="file" accept="image/jpeg,image/png,image/webp" className="text-xs text-zincMuted" />
            <span className="mt-2 block text-[11px] text-zincMuted">{t("members.emailOptional")}</span>
          </label>
          <GoldButton className="w-full sm:w-fit">{t("register.submit")}</GoldButton>
        </form>
      )}
    </AdminShell>
  );
}
