import { useEffect, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "../lib/auth/auth";
import { body } from "../lib/fonts";
import SiteHeader from "./SiteHeader";

// Gate for the signed-in tools (inventory, kanban, account). When auth is not
// configured the page is open; otherwise a visitor without a session is sent
// to sign in, and an account that is not onboarded or not yet approved is sent
// to /welcome. Both bring the visitor back here afterwards. `allowPending`
// lets a signed-in account through whatever its status (used by /account).
export default function AuthGate({ children, allowPending = false }: { children: ReactNode; allowPending?: boolean }) {
  const { user, loading, isConfigured, account, accountLoading } = useAuth();
  const router = useRouter();
  const signedOut = isConfigured && !loading && !user;
  const needsWelcome =
    isConfigured && !allowPending && !!account && (!account.onboarded || account.status !== "active");

  useEffect(() => {
    const here = router.state.location.pathname;
    if (signedOut) window.location.assign(`/sign-in?redirect=${encodeURIComponent(here)}`);
    else if (needsWelcome) window.location.assign(`/welcome?redirect=${encodeURIComponent(here)}`);
  }, [signedOut, needsWelcome, router]);

  const waiting = isConfigured && (loading || !user || (!allowPending && (accountLoading || needsWelcome)));
  if (waiting) {
    return (
      <main>
        <SiteHeader />
        <section className="flex min-h-[calc(100vh-76px)] items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-3 text-neutral-500">
            <Loader2 className="h-6 w-6 animate-spin text-[#0B6477]" />
            <p className="text-sm" style={body}>
              {loading || accountLoading ? "Checking access..." : signedOut ? "Redirecting to sign in..." : "Redirecting..."}
            </p>
          </div>
        </section>
      </main>
    );
  }
  return <>{children}</>;
}
