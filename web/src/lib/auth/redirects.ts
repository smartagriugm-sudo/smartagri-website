// Where Supabase sends people back after they click the link in an auth email.
// Always the site the person is using (production, a preview or localhost), so
// a confirmation never lands on a dead localhost address. Each origin must be
// in Supabase's Redirect URLs list (SETUP-AUTH.md).
export function confirmRedirectUrl(redirect?: string): string {
  const base = `${window.location.origin}/auth/confirm`
  return redirect ? `${base}?redirect=${encodeURIComponent(redirect)}` : base
}
