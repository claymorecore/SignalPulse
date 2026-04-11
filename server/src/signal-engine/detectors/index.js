import detectBreakout from "./breakout.js";
import detectPullback from "./pullback.js";
import detectTrendContinuation from "./trendContinuation.js";

export const detectorRegistry = [
  {
    key: "trend-continuation",
    setupType: "trend_continuation",
    detect: detectTrendContinuation
  },
  {
    key: "breakout",
    setupType: "breakout",
    detect: detectBreakout
  },
  {
    key: "pullback",
    setupType: "pullback",
    detect: detectPullback
  }
];

export default detectorRegistry;
