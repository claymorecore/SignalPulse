import { createElement, type ReactNode } from "react";
import cx from "../../lib/cx";

type HeadingProps = {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  hero?: boolean;
  className?: string;
  children: ReactNode;
};

export default function Heading({ level = 2, hero = false, className, children }: HeadingProps) {
  const tag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  return createElement(tag, { className: cx("heading", hero ? "heading--hero" : "heading--section", className) }, children);
}


