import { useRouter } from "next/router";
import { FormEvent, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthFrame } from "@/components/AuthFrame";
import { Field, GoldButton, LoadingBlock, Notice } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { errorKey, useI18n } from "@/lib/i18n";
import { passwordIssue } from "@/lib/validation";
import type { SessionUser, TokenInfo } from "@/lib/types";

export function SetPasswordContainer() {
  const { t } = useI18n();
  const router = useRouter();
  const client = useQueryClient();
  const token = typeof router.query.token === "string" ? router.query.token : "";
  const info = useQuery({
    queryKey: ["token", token],
    enabled: token.length > 0,
    queryFn: () => api<TokenInfo>(`/api/auth/tokens/${token}`),
    retry: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirm = String(form.get("confirm") || "");
    const issue = passwordIssue(password);
    if (issue) {
      setError(t("errors.weak"));
      return;
    }
    if (password !== confirm) {
      setError(t("set.mismatch"));
      return;
    }
    setPending(true);
    setError(null);
    try {
      const user = await api<SessionUser>("/api/auth/set-password", { body: { token, password } });
      await client.invalidateQueries({ queryKey: ["me"] });
      router.push(user.role === "ADMIN" ? "/admin" : "/catalog");
    } catch (caught) {
      setError(t(errorKey(caught instanceof ApiError ? caught.code : undefined)));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthFrame>
      <h2 className="mb-2 font-serif text-2xl text-white">{t("set.title")}</h2>
      <p className="mb-8 text-xs leading-relaxed text-zincMuted">{t("set.lead")}</p>
      {!router.isReady || (token && info.isLoading) ? <LoadingBlock label={t("common.loading")} /> : null}
      {router.isReady && (!token || info.data?.valid === false) ? <Notice>{t("set.invalid")}</Notice> : null}
      {info.data?.valid ? (
        <form className="space-y-5" onSubmit={onSubmit}>
          {info.data.firstName ? <p className="text-sm text-zincBright">{info.data.firstName}</p> : null}
          {info.data.emailHint ? <p className="text-xs text-zincMuted">{info.data.emailHint}</p> : null}
          {error ? <Notice>{error}</Notice> : null}
          <Field label={t("set.password")} name="password" type="password" required />
          <Field label={t("set.confirm")} name="confirm" type="password" required />
          <GoldButton disabled={pending} className="w-full">
            {t("set.submit")}
          </GoldButton>
        </form>
      ) : null}
    </AuthFrame>
  );
}
