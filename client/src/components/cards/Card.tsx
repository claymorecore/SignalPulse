import type { ReactNode } from "react";
import cx from "../../lib/cx";

type CardProps = {
  variant?: "primary" | "secondary" | "tertiary";
  className?: string;
  children: ReactNode;
};

export default function Card({ variant = "secondary", className, children }: CardProps) {
  return (
    <article
      className={cx(
        "card",
        variant === "primary" && "card--primary",
        variant === "tertiary" && "card--tertiary",
        className,
      )}
    >
      {children}
    </article>
  );
}


