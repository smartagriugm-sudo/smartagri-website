import { useEffect } from "react";
import type { ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "../lib/auth/auth";
import { body } from "../lib/fonts";
import SiteHeader from "./SiteHeader";

// Gates a page behind Supabase auth, mirroring the behaviour of the /ai area
// (see routes/ai/route.tsx, which carries the same logic inline for the whole
// /ai subtree). Extracted here so a single page can be gated without having to
// restructure it into a layout route.
//
// Two things this deliberately does NOT do, both worth knowing before relying
// on it for anything more sensitive than a demo:
//
//  - When Supabase env is absent the gate is open, matching the rest of the
//    site. A deployment with no VITE_SUPABASE_URL keeps the page public.
//  - The check runs in the browser. It keeps a page out of casual view, but it
//    is not a server-side access control: the route's code still ships to
//    anyone who asks for it. Real data must be protected at the API, the way
//    /api/ai/* verifies the Supabase token per request.
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading, isConfigured } = useAuth();
  const router = useRouter();

  const blocked = isConfigured && !loading && !user;

  useEffect(() => {
    if (blocked) {
      const here = router.state.location.pathname;
      window.location.assign(`/sign-in?redirect=${encodeURIComponent(here)}`);
    }
  }, [blocked, router]);

  if (isConfigured && (loading || !user)) {
    return (
      <main>
        <SiteHeader />
        <section className="flex min-h-[calc(100vh-76px)] items-center justify-center bg-[#F3F7F6]">
          <div className="flex flex-col items-center gap-3 text-neutral-500">
            <Loader2 className="h-6 w-6 animate-spin text-[#0B6477]" />
            <p className="text-sm" style={body}>
              {loading ? "Checking access..." : "Redirecting to sign in..."}
            </p>
          </div>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
