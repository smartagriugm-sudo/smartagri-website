import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { WorkLink } from "../../lib/pf/dashboard";

/** A link to wherever a piece of work is done. */
export function WorkLinkTo({ link, className, onClick, children }: { link: WorkLink; className: string; onClick?: () => void; children: ReactNode }) {
  if ("id" in link) return <Link to={link.to} params={{ id: link.id }} onClick={onClick} className={className}>{children}</Link>;
  return <Link to={link.to} onClick={onClick} className={className}>{children}</Link>;
}
