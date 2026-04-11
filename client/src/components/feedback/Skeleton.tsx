import cx from "../../lib/cx";

type SkeletonProps = {
  className?: string;
};

export default function Skeleton({ className }: SkeletonProps) {
  return <div className={cx("skeleton", className)} aria-hidden="true" />;
}
