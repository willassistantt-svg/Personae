import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/AdminShell";
import { LoadingBlock, QuietButton } from "@/components/ui";
import { useGuard } from "@/hooks/useGuard";
import { api } from "@/lib/api";
import { formatWhen } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { HouseLink, Issued } from "@/lib/types";

export function LinksContainer() {
  const session = useGuard(true);
  const { t, locale } = useI18n();
  const client = useQueryClient();
  const [copied, setCopied] = useState<string | null>(null);
  const links = useQuery({
    queryKey: ["links"],
    enabled: session.user?.role === "ADMIN",
    queryFn: () => api<HouseLink[]>("/api/admin/links"),
  });
  const resend = useMutation({
    mutationFn: (userId: string) => api<Issued>(`/api/admin/members/${userId}/link?sendEmail=true`, { method: "POST" }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["links"] }),
  });
  if (!session.user || session.user.role !== "ADMIN") return <LoadingBlock label={t("common.loading")} />;
  return (
    <AdminShell user={session.user} title={t("links.title")}>
      <h3 className="font-serif text-4xl italic">{t("links.title")}</h3>
      <p className="mb-8 mt-3 max-w-xl text-sm text-zincMuted">{t("links.lead")}</p>
      {links.isLoading ? <LoadingBlock label={t("common.loading")} /> : null}
      {links.data && links.data.length === 0 ? <p className="text-sm text-zincMuted">{t("links.empty")}</p> : null}
      <div className="space-y-4">
        {links.data?.map((item) => (
          <article key={item.id} className="rounded-[2rem] border border-hairline bg-charcoal p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-zincMuted">{item.email} · {t(`links.purpose.${item.purpose}`)} · {formatWhen(item.expiresAt, locale)}</p>
              </div>
              <span className="text-[10px] uppercase tracking-widest text-champagne">{item.emailStatus}</span>
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input readOnly value={item.link} className="w-full rounded-2xl border border-hairline bg-graphite px-4 py-3 text-xs" />
              <QuietButton
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(item.link);
                  setCopied(item.id);
                }}
              >
                {copied === item.id ? t("members.copied") : t("members.copy")}
              </QuietButton>
              <QuietButton type="button" onClick={() => resend.mutate(item.userId)}>{t("members.resend")}</QuietButton>
            </div>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
