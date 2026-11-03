import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/AdminShell";
import { LoadingBlock } from "@/components/ui";
import { ActivityTable } from "@/containers/DashboardContainer";
import { useGuard } from "@/hooks/useGuard";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Audit } from "@/lib/types";

export function ActivityContainer() {
  const session = useGuard(true);
  const { t, locale } = useI18n();
  const activity = useQuery({
    queryKey: ["activity"],
    enabled: session.user?.role === "ADMIN",
    queryFn: () => api<Audit[]>("/api/admin/activity"),
  });
  if (!session.user || session.user.role !== "ADMIN") return <LoadingBlock label={t("common.loading")} />;
  return (
    <AdminShell user={session.user} title={t("activity.title")}>
      <h3 className="break-words font-serif text-3xl italic sm:text-4xl">{t("activity.title")}</h3>
      <p className="mb-8 mt-3 max-w-xl text-sm text-zincMuted">{t("activity.lead")}</p>
      {activity.data ? (
        <ActivityTable
          rows={activity.data}
          locale={locale}
          title={t("admin.activityTitle")}
          labels={[t("admin.event"), t("admin.subject"), t("admin.when"), t("admin.state")]}
        />
      ) : (
        <LoadingBlock label={t("common.loading")} />
      )}
    </AdminShell>
  );
}
