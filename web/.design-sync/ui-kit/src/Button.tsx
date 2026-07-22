import type { ReactNode } from "react";
import { body } from "./fonts";

export type ButtonVariant = "primary" | "outline" | "outlineDark";

export type ButtonProps = {
  /** Button label / content. */
  children: ReactNode;
  /** Render as an anchor when set; otherwise a <button>. */
  href?: string;
  /**
   * primary: the mint pill for the main action.
   * outline: white-bordered, for dark panels.
   * outlineDark: teal-bordered, for light backgrounds.
   */
  variant?: ButtonVariant;
  /** Click handler used when no href is given. */
  onClick?: () => void;
};

// smartagri's core call-to-action control. The mint `primary` pill
// (#45DFB1 on #0B2A22, hover #80ED99) is the one main action per view; the
// outline variants are the secondary action beside it.
export function Button({ children, href, variant = "primary", onClick }: ButtonProps) {
  const base =
    "h-12 md:h-14 px-8 rounded-2xl text-lg font-medium transition-colors flex items-center justify-center";
  const styles: Record<ButtonVariant, string> = {
    primary: "bg-[#45DFB1] text-[#0B2A22] hover:bg-[#80ED99] shadow-lg",
    outline: "border border-white/40 text-white hover:bg-white/10",
    outlineDark: "border border-[#0B6477]/30 text-[#0B6477] hover:bg-[#0B6477]/5",
  };
  const cls = `${base} ${styles[variant]}`;
  if (href) {
    return (
      <a href={href} className={cls} style={body}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls} style={body}>
      {children}
    </button>
  );
}
