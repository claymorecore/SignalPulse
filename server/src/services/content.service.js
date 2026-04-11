const learnItems = [
  {
    slug: "market-orientation",
    title: "Market Orientation",
    category: "Foundation",
    summary: "Learn how SignalPulse separates awareness from action so decision quality improves before execution starts.",
    body: [
      "Start by identifying regime, breadth, and participation.",
      "Only move into signal review once the market state is legible.",
      "Use the dashboard after context is already established."
    ]
  },
  {
    slug: "signal-validation",
    title: "Signal Validation",
    category: "Signal literacy",
    summary: "Structured setups matter only when they survive market context, invalidation logic, and risk framing.",
    body: [
      "Check whether the signal agrees with the current regime.",
      "Confirm entry, stop, and target structure before sizing.",
      "Do not let headline flow override invalidation."
    ]
  },
  {
    slug: "execution-discipline",
    title: "Execution Discipline",
    category: "Execution",
    summary: "Execution should feel narrower than analysis. The platform aims to reduce action, not multiply it.",
    body: [
      "Translate context into a measured plan.",
      "Keep tooling subordinate to the setup, not the other way around.",
      "Feed outcomes back into the learning layer."
    ]
  }
];

const docsItems = [
  {
    slug: "platform-model",
    title: "Platform Model",
    category: "System foundations",
    summary: "SignalPulse is organized into awareness, intelligence, execution, and knowledge.",
    body: [
      "Awareness explains what is happening.",
      "Intelligence explains what matters.",
      "Execution explains what to do next.",
      "Knowledge explains why the system works the way it does."
    ]
  },
  {
    slug: "market-structure",
    title: "Market Structure",
    category: "Methodology",
    summary: "Market structure compresses breadth, regime, volatility, and participation into one usable frame.",
    body: [
      "Context comes before setup interpretation.",
      "Breadth and liquidity influence how trustworthy a signal becomes.",
      "A quiet market is still useful information."
    ]
  },
  {
    slug: "signal-definitions",
    title: "Signal Definitions",
    category: "Definitions",
    summary: "The docs layer keeps signal terms stable so all users work from the same language.",
    body: [
      "Entry defines where the trade thesis starts.",
      "Stop defines where the thesis fails.",
      "Target defines where reward is realized."
    ]
  }
];

export const listLearnContent = () => learnItems.slice();
export const getLearnContent = (slug) =>
  learnItems.find((item) => item.slug === slug) || null;

export const listDocsContent = () => docsItems.slice();
export const getDocsContent = (slug) =>
  docsItems.find((item) => item.slug === slug) || null;
