import type { ReactNode } from "react";
import { useAuth } from "../../lib/auth/auth";
import { body, display } from "../../lib/fonts";
import AuthGate from "../AuthGate";
import SiteHeader from "../SiteHeader";

// The ERP's door: signed in, onboarded and approved, or no entry. Unlike the rest
// of the site it stays shut on a deployment with no Supabase settings, since an
// open gate there would show the ERP to anyone. Only `npm run dev` may run
// without them. RLS still protects the data behind this.
export default function ErpGate({ children }: { children: ReactNode }) {
  const { isConfigured } = useAuth();
  if (!isConfigured && !import.meta.env.DEV) {
    return (
      <main>
        <SiteHeader />
        <section className="flex min-h-[calc(100vh-76px)] items-center justify-center bg-white px-4 text-center" style={body}>
          <div>
            <h1 className="text-[22px] font-semibold tracking-[-0.025em] text-[#0F2F36]" style={display}>ERP belum bisa dibuka di sini</h1>
            <p className="mt-2 text-[15px] leading-[1.5] text-[#4F6B73]">Pengaturan login belum diisi untuk deployment ini.</p>
          </div>
        </section>
      </main>
    );
  }
  return <AuthGate>{children}</AuthGate>;
}
