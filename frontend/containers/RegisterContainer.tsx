import Link from "next/link";
import { FormEvent, useState } from "react";
import { AuthFrame } from "@/components/AuthFrame";
import { Field, GoldButton, Notice } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { errorKey, useI18n } from "@/lib/i18n";
import { isAdult } from "@/lib/validation";

export function RegisterContainer() {
  const { t, locale } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const birth = String(form.get("birthDate") || "");
    if (!isAdult(birth)) {
      setError(t("errors.underage"));
      return;
    }
    if (form.get("contactAuthorized") !== "on") {
      setError(t("errors.contact"));
      return;
    }
    form.set("contactAuthorized", "true");
    form.set("locale", locale);
    setPending(true);
    setError(null);
    try {
      await api("/api/auth/register", { method: "POST", form });
      setDone(true);
    } catch (caught) {
      setError(t(errorKey(caught instanceof ApiError ? caught.code : undefined)));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthFrame>
      {done ? (
        <div>
          <h2 className="mb-4 font-serif text-3xl italic text-white">{t("register.waitingTitle")}</h2>
          <p className="text-sm leading-relaxed text-zincMuted">{t("register.waitingBody")}</p>
          <Link href="/" className="mt-8 inline-block text-[10px] uppercase tracking-[0.25em] text-champagne">
            {t("register.back")}
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-8">
            <h2 className="mb-2 font-serif text-2xl text-white">{t("register.title")}</h2>
            <p className="text-xs leading-relaxed text-zincMuted">{t("register.lead")}</p>
          </div>
          <form className="space-y-5" onSubmit={onSubmit}>
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
            <Field label={t("register.country")} name="country" required defaultValue={locale === "pt" ? "Brasil" : "Brazil"} />
            <Field label={t("register.travel")} name="travelLocations" hint={t("register.travelHint")} />
            <label className="flex items-start gap-3 text-xs leading-relaxed text-zincMuted">
              <input name="contactAuthorized" type="checkbox" className="mt-1 h-4 w-4 accent-champagne" />
              {t("register.contact")}
            </label>
            <label className="block">
              <span className="mb-2 ml-1 block text-[10px] font-bold uppercase tracking-widest text-zincMuted">{t("register.document")}</span>
              <input name="document" type="file" accept="image/jpeg,image/png,image/webp" required className="w-full text-xs text-zincMuted file:mr-4 file:rounded-full file:border-0 file:bg-champagne file:px-4 file:py-2 file:text-[10px] file:font-bold file:uppercase file:tracking-widest file:text-ink" />
              <span className="mt-2 block text-[11px] leading-relaxed text-zincMuted">{t("register.documentHelp")}</span>
            </label>
            <GoldButton type="submit" disabled={pending} className="w-full">
              {t("register.submit")}
            </GoldButton>
          </form>
        </>
      )}
    </AuthFrame>
  );
}
