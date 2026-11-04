import { useRouter } from "next/router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/AdminShell";
import { GoldButton, LoadingBlock, Notice, QuietButton, StatusPill } from "@/components/ui";
import { useGuard } from "@/hooks/useGuard";
import { ApiError, api } from "@/lib/api";
import { formatWhen } from "@/lib/format";
import { errorKey, useI18n } from "@/lib/i18n";
import type { Issued, Member } from "@/lib/types";

export function MemberDetailContainer() {
  const session = useGuard(true);
  const { t, locale } = useI18n();
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : "";
  const client = useQueryClient();
  const [sendEmail, setSendEmail] = useState(true);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const member = useQuery({
    queryKey: ["member", id],
    enabled: Boolean(session.user?.role === "ADMIN" && id),
    queryFn: () => api<Member>(`/api/admin/members/${id}`),
  });

  async function run(action: () => Promise<Issued | Member | void>) {
    setError(null);
    try {
      const result = await action();
      if (result && "link" in result) setLink(result.link);
      await client.invalidateQueries({ queryKey: ["member", id] });
      await client.invalidateQueries({ queryKey: ["members"] });
      await client.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (caught) {
      setError(t(errorKey(caught instanceof ApiError ? caught.code : undefined)));
    }
  }

  const approve = useMutation({ mutationFn: () => api<Issued>(`/api/admin/members/${id}/approve?sendEmail=${sendEmail}`, { method: "POST", success: "feedback.memberApproved" }), onSuccess: (result) => setLink(result.link) });

  if (!session.user || session.user.role !== "ADMIN" || member.isLoading) {
    return <LoadingBlock label={t("common.loading")} />;
  }
  if (!member.data) {
    return (
      <AdminShell user={session.user} title={t("members.title")}>
        <Notice>{t("common.error")}</Notice>
      </AdminShell>
    );
  }
  const person = member.data;
  const shownLink = link || person.link;

  return (
    <AdminShell user={session.user} title={person.memberCode}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="break-words font-serif text-3xl italic sm:text-4xl">{person.firstName} {person.lastName}</h3>
          <p className="mt-2 break-all text-sm text-zincMuted">{person.email}</p>
        </div>
        <StatusPill tone={person.status === "ACTIVE" ? "green" : person.status === "DISABLED" || person.status === "REJECTED" ? "rose" : "gold"}>
          {t(`member.${person.status}`)}
        </StatusPill>
      </div>
      {error ? <div className="mb-6"><Notice>{error}</Notice></div> : null}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section className="rounded-[1.5rem] border border-hairline bg-charcoal p-5 sm:rounded-[2rem] sm:p-8">
          <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Item label={t("register.birth")} value={person.birthDate} />
            <Item label={t("register.phone")} value={person.phone} />
            <Item label={t("register.city")} value={`${person.city}, ${person.state}`} />
            <Item label={t("register.country")} value={person.country} />
            <Item label={t("members.travel")} value={person.travelLocations || "—"} />
            <Item label={t("members.contact")} value={person.contactAuthorized ? t("members.yes") : t("members.no")} />
            <Item label={t("admin.when")} value={formatWhen(person.createdAt, locale)} />
            <Item label="Locale" value={person.locale} />
          </dl>
        </section>
        <section className="rounded-[1.5rem] border border-hairline bg-charcoal p-5 sm:rounded-[2rem] sm:p-8">
          <h4 className="mb-4 font-serif text-2xl italic">{t("members.document")}</h4>
          {person.hasDocument ? (
            <img src={`/api/admin/members/${person.id}/document`} alt="" className="max-h-[420px] w-full rounded-3xl object-contain" />
          ) : (
            <p className="text-sm text-zincMuted">{t("members.noDocument")}</p>
          )}
        </section>
      </div>
      <section className="mt-8 rounded-[1.5rem] border border-hairline bg-charcoal p-5 sm:rounded-[2rem] sm:p-8">
        <label className="mb-6 flex items-center gap-3 text-sm text-zincMuted">
          <input type="checkbox" checked={sendEmail} onChange={(event) => setSendEmail(event.target.checked)} className="h-4 w-4 accent-champagne" />
          {t("members.send")}
        </label>
        <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
          {person.status === "PENDING_REVIEW" || person.status === "REJECTED" ? (
            <GoldButton type="button" disabled={approve.isPending} onClick={() => run(() => approve.mutateAsync())}>{t("members.approve")}</GoldButton>
          ) : null}
          {person.status === "PENDING_REVIEW" ? (
            <QuietButton type="button" onClick={() => run(() => api<Member>(`/api/admin/members/${id}/reject`, { method: "POST", success: "feedback.memberRejected" }))}>{t("members.reject")}</QuietButton>
          ) : null}
          {person.status !== "DISABLED" && person.role !== "ADMIN" ? (
            <QuietButton type="button" onClick={() => run(() => api<Member>(`/api/admin/members/${id}/disable`, { method: "POST", success: "feedback.memberDisabled" }))}>{t("members.disable")}</QuietButton>
          ) : null}
          {person.status === "DISABLED" ? (
            <QuietButton type="button" onClick={() => run(() => api<Member>(`/api/admin/members/${id}/enable`, { method: "POST", success: "feedback.memberEnabled" }))}>{t("members.enable")}</QuietButton>
          ) : null}
          {person.status === "INVITED" || person.status === "ACTIVE" ? (
            <QuietButton type="button" onClick={() => run(() => api<Issued>(`/api/admin/members/${id}/link?sendEmail=${sendEmail}`, { method: "POST", success: "feedback.linkIssued" }))}>{t("members.resend")}</QuietButton>
          ) : null}
          {person.role !== "ADMIN" ? (
            <QuietButton
              type="button"
              onClick={() => {
                if (window.confirm(t("members.confirm"))) {
                  run(async () => {
                    await api(`/api/admin/members/${id}`, { method: "DELETE", success: "feedback.memberRemoved" });
                    router.push("/admin/members");
                  });
                }
              }}
            >
              {t("members.remove")}
            </QuietButton>
          ) : null}
        </div>
        {shownLink ? (
          <div className="mt-8">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-champagne">{t("members.linkReady")}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input readOnly value={shownLink} className="w-full min-w-0 rounded-2xl border border-hairline bg-graphite px-4 py-3 text-base text-white" />
              <QuietButton
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(shownLink);
                  setCopied(true);
                }}
              >
                {copied ? t("members.copied") : t("members.copy")}
              </QuietButton>
            </div>
            {person.emailStatus ? <p className="mt-3 text-xs text-zincMuted">{person.emailStatus}</p> : null}
          </div>
        ) : null}
      </section>
    </AdminShell>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-widest text-zincMuted">{label}</dt>
      <dd className="mt-1 break-words text-sm text-white">{value}</dd>
    </div>
  );
}
