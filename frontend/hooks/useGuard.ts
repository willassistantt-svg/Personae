import { useRouter } from "next/router";
import { useEffect } from "react";
import { useSession } from "@/hooks/useSession";

export function useGuard(admin = false) {
  const session = useSession();
  const router = useRouter();
  useEffect(() => {
    if (session.loading) {
      return;
    }
    if (!session.user) {
      router.replace("/");
      return;
    }
    if (admin && session.user.role !== "ADMIN") {
      router.replace("/catalog");
    }
  }, [admin, router, session.loading, session.user]);
  return session;
}
