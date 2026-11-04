import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useState } from "react";
import { ShieldCheck } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { AuthFrame } from "@/components/AuthFrame";
import { Field, GoldButton, Notice } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { errorKey, useI18n } from "@/lib/i18n";
import type { SessionUser } from "@/lib/types";

export function LoginContainer() {
  const { t } = useI18n();
  const router = useRouter();
  const client = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      const user = await api<SessionUser>("/api/auth/login", {
        body: {
          email: String(form.get("email") || ""),
          password: String(form.get("password") || ""),
          remember: form.get("remember") === "on",
        },
        success: "feedback.signedIn",
      });
      client.setQueryData(["me"], user);
      router.push(user.role === "ADMIN" ? "/admin" : "/catalog");
    } catch (caught) {
      setError(t(errorKey(caught instanceof ApiError ? caught.code : undefined)));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthFrame>
      <div className="mb-8">
        <h2 className="mb-2 font-serif text-2xl text-white">{t("login.title")}</h2>
        <p className="text-xs leading-relaxed text-zincMuted">{t("login.lead")}</p>
      </div>
      <form className="space-y-6" onSubmit={onSubmit}>
        {error ? <Notice>{error}</Notice> : null}
        <Field label={t("login.email")} name="email" type="email" required placeholder="membership@personae.men" />
        <Field label={t("login.password")} name="password" type="password" required placeholder="••••••••••••" />
        <div className="flex flex-wrap items-center justify-between gap-3 py-1">
          <label className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-zincMuted">
            <input name="remember" type="checkbox" className="h-4 w-4 rounded border-hairline bg-graphite accent-champagne" />
            {t("login.remember")}
          </label>
          <Link href="/forgot-password" className="inline-flex min-h-11 items-center text-[10px] uppercase tracking-wider text-champagne hover:text-champagneSoft">
            {t("login.forgot")}
          </Link>
        </div>
        <GoldButton type="submit" disabled={pending} className="mt-2 w-full">
          {t("login.submit")}
        </GoldButton>
      </form>
      <Link href="/register" className="mt-6 flex min-h-11 items-center justify-center text-center text-[10px] uppercase tracking-[0.25em] text-champagne hover:text-champagneSoft">
        {t("login.register")}
      </Link>
      <div className="mt-8 flex items-start gap-3 border-t border-hairline/60 pt-8">
        <ShieldCheck className="text-lg text-champagne" />
        <p className="text-[10px] leading-relaxed text-zincMuted">{t("login.security")}</p>
      </div>
    </AuthFrame>
  );
}
