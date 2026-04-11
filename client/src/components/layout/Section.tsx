import type { ReactNode } from "react";
import cx from "../../lib/cx";
import useRevealOnScroll from "../../hooks/useRevealOnScroll";

type SectionProps = {
  density?: "default" | "dense" | "break";
  className?: string;
  children: ReactNode;
  reveal?: boolean;
};

export default function Section({ density = "default", className, children, reveal = true }: SectionProps) {
  const revealRef = useRevealOnScroll<HTMLElement>();
  return (
    <section
      ref={reveal ? revealRef : undefined}
      className={cx(
        "section",
        reveal && "reveal",
        density === "dense" && "section--dense",
        density === "break" && "section--break",
        className,
      )}
    >
      {children}
    </section>
  );
}


