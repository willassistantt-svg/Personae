import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/AdminShell";
import { LoadingBlock, StatusPill } from "@/components/ui";
import { useGuard } from "@/hooks/useGuard";
import { api } from "@/lib/api";
import { formatWhen } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { Dashboard } from "@/lib/types";

export function DashboardContainer() {
  const session = useGuard(true);
  const { t, locale } = useI18n();
  const board = useQuery({
    queryKey: ["dashboard"],
    enabled: session.user?.role === "ADMIN",
    queryFn: () => api<Dashboard>("/api/admin/dashboard"),
  });
  if (!session.user || session.user.role !== "ADMIN") {
    return <LoadingBlock label={t("common.loading")} />;
  }
  const data = board.data;
  return (
    <AdminShell user={session.user} title={t("admin.overview")}>
      {board.isLoading ? <LoadingBlock label={t("common.loading")} /> : null}
      {board.isError ? <p className="text-sm text-rose">{t("common.error")}</p> : null}
      {data ? (
        <>
          <section className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <Kpi label={t("admin.active")} value={data.activeMembers} note={t("admin.stable")} />
            <Kpi label={t("admin.pending")} value={data.pendingMembers} note={data.pendingMembers ? t("admin.action") : t("admin.stable")} rose={data.pendingMembers > 0} />
            <Kpi label={t("admin.published")} value={data.publishedProfiles} note={`${data.photos} · ${t("admin.photos")}`} />
            <Kpi label={t("admin.hidden")} value={data.hiddenProfiles} note={data.hiddenProfiles ? t("admin.action") : t("admin.stable")} rose={data.hiddenProfiles > 0} />
          </section>
          <section className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Mini label={t("admin.invited")} value={data.invitedMembers} />
            <Mini label={t("admin.disabled")} value={data.disabledMembers} />
            <Mini label={t("admin.photos")} value={data.photos} />
            <Mini label={t("admin.videos")} value={data.videos} />
          </section>
          <section className="mb-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="rounded-3xl border border-hairline bg-charcoal p-6 md:p-8">
              <h4 className="mb-6 font-serif text-xl italic">{t("admin.growth")}</h4>
              <Growth points={data.growth} />
            </div>
            <div className="rounded-3xl border border-hairline bg-charcoal p-6 md:p-8">
              <h4 className="mb-6 font-serif text-xl italic">{t("admin.media")}</h4>
              <Donut photos={data.photos} videos={data.videos} photoLabel={t("admin.photos")} videoLabel={t("admin.videos")} />
            </div>
          </section>
          <ActivityTable rows={data.recent} locale={locale} title={t("admin.activityTitle")} more={t("admin.viewAll")} labels={[t("admin.event"), t("admin.subject"), t("admin.when"), t("admin.state")]} />
        </>
      ) : null}
    </AdminShell>
  );
}

function Kpi({ label, value, note, rose = false }: { label: string; value: number; note: string; rose?: boolean }) {
  return (
    <div className={`rounded-2xl border bg-charcoal p-6 ${rose ? "border-rose/30" : "border-hairline"}`}>
      <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-zincMuted">{label}</p>
      <div className="flex items-end justify-between">
        <h3 className={`font-serif text-3xl ${rose ? "text-rose" : "text-white"}`}>{value}</h3>
        <span className={`rounded px-2 py-1 text-xs font-bold ${rose ? "bg-rose/10 text-rose" : "bg-graphite text-zincMuted"}`}>{note}</span>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-hairline bg-charcoal px-4 py-3">
      <p className="text-[10px] uppercase tracking-widest text-zincMuted">{label}</p>
      <p className="font-serif text-2xl">{value}</p>
    </div>
  );
}

function Growth({ points }: { points: { date: string; members: number }[] }) {
  if (points.length === 0) return null;
  const width = 640;
  const height = 260;
  const max = Math.max(...points.map((point) => point.members), 1);
  const step = width / Math.max(points.length - 1, 1);
  const coords = points.map((point, index) => {
    const x = index * step;
    const y = height - 24 - (point.members / max) * (height - 48);
    return { x, y };
  });
  const line = coords.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[260px] w-full">
      <path d={area} fill="rgba(212,175,55,0.12)" />
      <path d={line} fill="none" stroke="#d4af37" strokeWidth="3" />
      {coords.filter((_, index) => index % 5 === 0).map((point, index) => (
        <text key={points[index * 5].date} x={point.x} y={height - 4} fill="#71717a" fontSize="11">
          {points[index * 5].date.slice(5)}
        </text>
      ))}
    </svg>
  );
}

function Donut({ photos, videos, photoLabel, videoLabel }: { photos: number; videos: number; photoLabel: string; videoLabel: string }) {
  const total = Math.max(photos + videos, 1);
  const photoSweep = (photos / total) * 100;
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div
        className="h-44 w-44 rounded-full"
        style={{
          background: `conic-gradient(#d4af37 0 ${photoSweep}%, #e8c96a ${photoSweep}% 100%)`,
        }}
      >
        <div className="m-8 flex h-28 w-28 items-center justify-center rounded-full bg-charcoal font-serif text-2xl">{photos + videos}</div>
      </div>
      <div className="space-y-3 text-sm text-zincMuted">
        <p><span className="mr-2 inline-block h-2 w-2 rounded-full bg-champagne" />{photoLabel} · {photos}</p>
        <p><span className="mr-2 inline-block h-2 w-2 rounded-full bg-champagneSoft" />{videoLabel} · {videos}</p>
      </div>
    </div>
  );
}

export function ActivityTable({
  rows,
  locale,
  title,
  more,
  labels,
}: {
  rows: Dashboard["recent"];
  locale: "pt" | "en";
  title: string;
  more?: string;
  labels: string[];
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-hairline bg-charcoal">
      <div className="flex items-center justify-between border-b border-hairline/60 p-6 md:p-8">
        <h4 className="font-serif text-xl italic">{title}</h4>
        {more ? (
          <Link href="/admin/activity" className="text-[10px] font-bold uppercase tracking-widest text-champagne">
            {more}
          </Link>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-hairline/40 text-[10px] font-bold uppercase tracking-widest text-zincMuted">
              {labels.map((label) => (
                <th key={label} className="px-6 py-5">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline/40">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-white/5">
                <td className="px-6 py-4 text-sm">{row.eventType.replaceAll("_", " ")}</td>
                <td className="px-6 py-4 text-sm text-zincBright">{row.subject}</td>
                <td className="px-6 py-4 text-xs text-zincMuted">{formatWhen(row.createdAt, locale)}</td>
                <td className="px-6 py-4">
                  <StatusPill tone={row.status === "PENDING" || row.status === "HIDDEN" ? "gold" : row.status === "REMOVED" || row.status === "FAILED" ? "rose" : "green"}>
                    {row.status}
                  </StatusPill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
