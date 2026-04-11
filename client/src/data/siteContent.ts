export const navigationLinks = [
  { label: "Market", to: "/market" },
  { label: "Signals", to: "/signals" },
  { label: "Dashboard", to: "/dashboard" },
  { label: "Tools", to: "/tools" },
  { label: "Learn", to: "/learn" },
  { label: "Docs", to: "/docs" },
  { label: "News", to: "/news" },
  { label: "About", to: "/about" },
];

export const footerLinkGroups = [
  {
    title: "Platform",
    links: [
      { label: "Home", to: "/" },
      { label: "Market", to: "/market" },
      { label: "Signals", to: "/signals" },
      { label: "Dashboard", to: "/dashboard" },
    ],
  },
  {
    title: "Knowledge",
    links: [
      { label: "Learn", to: "/learn" },
      { label: "Docs", to: "/docs" },
      { label: "News", to: "/news" },
    ],
  },
  {
    title: "Utilities",
    links: [
      { label: "Tools", to: "/tools" },
      { label: "Definitions", to: "/docs" },
      { label: "Methodology", to: "/docs" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/about" },
      { label: "Philosophy", to: "/about" },
      { label: "Boundaries", to: "/about" },
    ],
  },
];

export const homepageContent = {
  hero: {
    eyebrow: "Structured crypto intelligence",
    title: "A calmer system for understanding crypto markets and acting with more clarity.",
    description:
      "SignalPulse organizes market awareness, signal interpretation, execution support, and knowledge into one connected product system.",
    status: "System online",
    tags: ["Awareness", "Execution", "Knowledge"],
    primaryCta: { label: "View Market", to: "/market" },
    secondaryCta: { label: "Open Dashboard", to: "/dashboard" },
    previewTitle: "Platform overview",
    previewChips: ["Market state", "Signals", "Execution"],
    previewRows: [
      { label: "Awareness", value: "82%" },
      { label: "Validation", value: "61%" },
      { label: "Execution", value: "54%" },
    ],
  },
  systemOverview: {
    eyebrow: "System overview",
    title: "SignalPulse behaves like one platform.",
    lead: "Instead of forcing users to jump between tools and feeds, the product uses structure to guide them from orientation into action.",
  },
  systemOverviewCta: {
    primary: { label: "Explore Layers", to: "/docs" },
    secondary: { label: "Read About", to: "/about" },
  },
  layers: {
    eyebrow: "Integrated layers",
    title: "Four layers, one flow.",
    lead: "Each page belongs to a clear product layer and supports the full decision cycle from awareness to feedback.",
  },
  corePages: {
    eyebrow: "Core pages",
    title: "Purpose-built routes for each stage of the workflow.",
    lead: "The page system keeps the product legible whether a user needs orientation, opportunity, monitoring, or explanation.",
  },
  corePagesCta: {
    primary: { label: "Start With Market", to: "/market" },
    secondary: { label: "Browse Learn", to: "/learn" },
  },
  process: {
    eyebrow: "How it works",
    title: "A decision system, not a content stream.",
    lead: "SignalPulse keeps the path from market awareness to execution tight and repeatable.",
  },
  differentiation: {
    eyebrow: "Why it feels different",
    title: "Built for guided decisions instead of raw interface density.",
    lead: "The product strips away exchange-style overload and noisy signal spam in favor of context, prioritization, and trust.",
  },
  finalCta: {
    title: "Start with structure, then move deeper only when needed.",
    description: "SignalPulse helps beginners orient quickly while giving advanced users a tighter operating surface for faster market work.",
    primary: { label: "Open Market", to: "/market" },
    secondary: { label: "Open Signals", to: "/signals" },
  },
};

export const systemCapabilities = [
  {
    icon: "grid",
    title: "Market awareness",
    description: "Summaries of regime, breadth, and conditions answer what is happening before the user reaches for setups.",
    meta: "High-level state first",
  },
  {
    icon: "signal",
    title: "Signal intelligence",
    description: "Opportunity feeds are filtered and structured so users can recognize what matters without digging through noise.",
    meta: "Context before conviction",
  },
  {
    icon: "docs",
    title: "Product knowledge",
    description: "Learn and Docs explain terms, methods, and strategy models without turning the site into a content dump.",
    meta: "Clarity without overload",
  },
];

export const productLayers = [
  {
    icon: "grid",
    title: "Awareness",
    question: "What is happening?",
    bullets: ["Market state", "Breadth and regime", "Contextual news"],
  },
  {
    icon: "signal",
    title: "Intelligence",
    question: "What matters?",
    bullets: ["Structured setups", "Interpretation layer", "Validation cues"],
  },
  {
    icon: "tools",
    title: "Execution",
    question: "What should I do?",
    bullets: ["Dashboard focus", "Trade structure", "Decision support tools"],
  },
  {
    icon: "docs",
    title: "Knowledge",
    question: "Why and how?",
    bullets: ["Learn progression", "Documentation", "Definitions and method"],
  },
];

export const corePages = [
  { to: "/market", icon: "grid", title: "Market", description: "High-level market state, breadth, and conditions.", preview: "Orientation layer" },
  { to: "/signals", icon: "signal", title: "Signals", description: "Filterable structured opportunity feed with clear setups.", preview: "Intelligence layer" },
  { to: "/dashboard", icon: "layers", title: "Dashboard", description: "Focused monitoring surface for active context.", preview: "Execution layer" },
  { to: "/tools", icon: "tools", title: "Tools", description: "Utility modules that support execution without owning the product.", preview: "Support layer" },
  { to: "/learn", icon: "docs", title: "Learn", description: "Progressive onboarding from beginner understanding to advanced application.", preview: "Knowledge layer" },
  { to: "/news", icon: "news", title: "News", description: "Curated relevance-first headlines tied back to market meaning.", preview: "Context layer" },
];

export const processSteps = [
  { title: "Market", description: "Read the environment before looking for opportunities." },
  { title: "Signal", description: "Identify candidate setups through a structured feed." },
  { title: "Validation", description: "Check whether the setup fits current market conditions." },
  { title: "Execution", description: "Monitor structure, sizing, and active trade context." },
  { title: "Feedback", description: "Learn from outcomes and improve the next cycle." },
];

export const differentiationRows = [
  {
    label: "Compared with dashboards",
    signalpulse: "SignalPulse starts with market interpretation and route clarity.",
    alternative: "Many dashboards optimize for raw widget density and constant monitoring.",
  },
  {
    label: "Compared with signal tools",
    signalpulse: "Signals are framed with context, validation, and next-step logic.",
    alternative: "Many signal products stop at alert delivery and leave interpretation to the user.",
  },
  {
    label: "Compared with complex terminals",
    signalpulse: "The interface is calmer, more legible, and easier to trust quickly.",
    alternative: "Complex terminals often make beginners feel lost and experts work around noise.",
  },
];

export const docsSections = [
  {
    title: "System foundations",
    description: "Defines the product model, four-layer architecture, and market-to-feedback workflow.",
    links: ["Platform model", "Decision flow", "Layer mapping"],
  },
  {
    title: "Methodology",
    description: "Explains how market state, signal interpretation, and execution support are framed inside SignalPulse.",
    links: ["Market structure", "Signal validation", "Execution support"],
  },
  {
    title: "Definitions",
    description: "Keeps terminology precise so new users and advanced users share the same vocabulary.",
    links: ["Breadth", "Regime", "Setup quality"],
  },
];

export const learnTracks = [
  {
    title: "Foundation track",
    description: "Understand the four product layers, core terminology, and how to move through the platform.",
    modules: ["Orientation", "Workflow", "Definitions"],
  },
  {
    title: "Signal literacy",
    description: "Learn how to read structured setups, validation cues, and context relationships.",
    modules: ["Setup anatomy", "Context signals", "Filtering"],
  },
  {
    title: "Execution discipline",
    description: "Translate interpretation into clearer monitoring, risk framing, and feedback loops.",
    modules: ["Monitoring", "Sizing support", "Review loops"],
  },
];

export const aboutPrinciples = [
  {
    icon: "layers",
    title: "Structure over noise",
    description: "The product exists to reduce chaos, not add another layer of market chatter.",
  },
  {
    icon: "signal",
    title: "Guidance over spam",
    description: "SignalPulse does not behave like a signal broadcast tool or a hype-driven community feed.",
  },
  {
    icon: "docs",
    title: "Trust through clarity",
    description: "Clear labels, bounded surfaces, and explicit roles help the interface feel institutional and calm.",
  },
];

export const toolGuides = [
  {
    icon: "tools",
    title: "Position sizing",
    description: "Use measured sizing support without losing sight of the broader decision context.",
  },
  {
    icon: "grid",
    title: "Scenario framing",
    description: "Build support and resistance scenarios around the market state already defined elsewhere.",
  },
  {
    icon: "layers",
    title: "Conversion utilities",
    description: "Access calculators and conversions only when they help execution move faster.",
  },
];


