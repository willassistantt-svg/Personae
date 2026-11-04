import Link from "next/link";
import { FormEvent, useState } from "react";
import { AuthFrame } from "@/components/AuthFrame";
import { Field, GoldButton, Notice } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { errorKey, useI18n } from "@/lib/i18n";

export function ForgotContainer() {
  const { t } = useI18n();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    try {
      await api("/api/auth/forgot-password", { body: { email: String(form.get("email") || "") }, success: "feedback.emailSent" });
      setSent(true);
    } catch (caught) {
      setError(t(errorKey(caught instanceof ApiError ? caught.code : undefined)));
    }
  }

  return (
    <AuthFrame>
      <h2 className="mb-2 font-serif text-2xl text-white">{t("forgot.title")}</h2>
      <p className="mb-8 text-xs leading-relaxed text-zincMuted">{t("forgot.lead")}</p>
      {sent ? (
        <p className="text-sm leading-relaxed text-zincBright">{t("forgot.sent")}</p>
      ) : (
        <form className="space-y-6" onSubmit={onSubmit}>
          {error ? <Notice>{error}</Notice> : null}
          <Field label={t("login.email")} name="email" type="email" required />
          <GoldButton type="submit" className="w-full">
            {t("forgot.submit")}
          </GoldButton>
        </form>
      )}
      <Link href="/" className="mt-8 inline-block text-[10px] uppercase tracking-[0.25em] text-champagne">
        {t("register.back")}
      </Link>
    </AuthFrame>
  );
}
