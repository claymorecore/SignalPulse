import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import cx from "../../lib/cx";

type ButtonProps = {
  to?: string;
  href?: string;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  children: ReactNode;
  onClick?: () => void;
};

export default function Button({ to, href, variant = "secondary", className, children, onClick }: ButtonProps) {
  const classes = cx("button", `button--${variant}`, className);

  if (to) {
    return (
      <Link to={to} className={classes} onClick={onClick}>
        {children}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={classes} onClick={onClick}>
        {children}
      </a>
    );
  }

  return <button className={classes} onClick={onClick}>{children}</button>;
}


