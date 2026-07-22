import type { ReactNode } from "react";
import { body } from "./fonts";

export type EyebrowProps = {
  /** Eyebrow text. */
  children: ReactNode;
  /** Extra classes (e.g. spacing) merged onto the label. */
  className?: string;
};

// The small teal label that sits above section headings: 13px, medium weight,
// slight positive tracking, and deliberately no uppercase. smartagri's eyebrow
// convention across every section intro.
export function Eyebrow({ children, className = "" }: EyebrowProps) {
  return (
    <div
      className={`text-[13px] font-medium tracking-[0.03em] text-[#14919B] ${className}`}
      style={body}
    >
      {children}
    </div>
  );
}
