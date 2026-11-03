import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/AdminShell";
import { LoadingBlock, QuietButton, StatusPill } from "@/components/ui";
import { useGuard } from "@/hooks/useGuard";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Member } from "@/lib/types";

const filters = ["", "PENDING_REVIEW", "INVITED", "ACTIVE", "DISABLED", "REJECTED"];

export function MembersContainer() {
  const session = useGuard(true);
  const { t } = useI18n();
  const [status, setStatus] = useState("");
  const members = useQuery({
    queryKey: ["members", status],
    enabled: session.user?.role === "ADMIN",
    queryFn: () => api<Member[]>(`/api/admin/members${status ? `?status=${status}` : ""}`),
  });
  if (!session.user || session.user.role !== "ADMIN") return <LoadingBlock label={t("common.loading")} />;
  return (
    <AdminShell user={session.user} title={t("members.title")}>
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h3 className="font-serif text-3xl italic sm:text-4xl">{t("members.title")}</h3>
          <p className="mt-3 max-w-xl text-sm text-zincMuted">{t("members.lead")}</p>
        </div>
        <Link href="/admin/members/new" className="gold-gradient block min-h-12 rounded-2xl px-6 py-4 text-center text-xs font-bold uppercase tracking-widest text-ink sm:inline-block">
          {t("members.new")}
        </Link>
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item || "all"}
            type="button"
            onClick={() => setStatus(item)}
            className={`min-h-11 rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-widest ${status === item ? "border-champagne text-champagne" : "border-hairline text-zincMuted"}`}
          >
            {item ? t(`member.${item}`) : t("catalog.all")}
          </button>
        ))}
      </div>
      {members.isLoading ? <LoadingBlock label={t("common.loading")} /> : null}
      {members.data && members.data.length === 0 ? <p className="text-sm text-zincMuted">{t("members.empty")}</p> : null}
      <div className="space-y-3 md:hidden">
        {members.data?.map((member) => (
          <article key={member.id} className="rounded-3xl border border-hairline bg-charcoal p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{member.firstName} {member.lastName}</p>
                <p className="break-all text-xs text-zincMuted">{member.email}</p>
                <p className="mt-1 text-xs text-zincMuted">{member.memberCode} · {member.city}</p>
              </div>
              <StatusPill tone={member.status === "ACTIVE" ? "green" : member.status === "DISABLED" || member.status === "REJECTED" ? "rose" : "gold"}>
                {t(`member.${member.status}`)}
              </StatusPill>
            </div>
            <Link href={`/admin/members/${member.id}`} className="mt-4 block">
              <QuietButton type="button" className="w-full">{t("members.open")}</QuietButton>
            </Link>
          </article>
        ))}
      </div>
      <div className="hidden overflow-hidden rounded-3xl border border-hairline bg-charcoal md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <tbody className="divide-y divide-hairline/40">
              {members.data?.map((member) => (
                <tr key={member.id}>
                  <td className="px-6 py-5">
                    <p className="font-medium">{member.firstName} {member.lastName}</p>
                    <p className="text-xs text-zincMuted">{member.email} · {member.memberCode}</p>
                  </td>
                  <td className="px-6 py-5 text-sm text-zincMuted">{member.city}, {member.state}</td>
                  <td className="px-6 py-5">
                    <StatusPill tone={member.status === "ACTIVE" ? "green" : member.status === "DISABLED" || member.status === "REJECTED" ? "rose" : "gold"}>
                      {t(`member.${member.status}`)}
                    </StatusPill>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <Link href={`/admin/members/${member.id}`}>
                      <QuietButton type="button">{t("members.open")}</QuietButton>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
