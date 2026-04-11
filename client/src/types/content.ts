export type LinkItem = {
  label: string;
  to: string;
};

export type CtaLink = LinkItem;

export type CtaPair = {
  primary: CtaLink;
  secondary: CtaLink;
};

export type FooterGroup = {
  title: string;
  links: LinkItem[];
};

export type PreviewRow = {
  label: string;
  value: string;
};

export type HeroContent = {
  eyebrow: string;
  title: string;
  description: string;
  status: string;
  tags: string[];
  primaryCta: CtaLink;
  secondaryCta: CtaLink;
  previewTitle: string;
  previewChips: string[];
  previewRows: PreviewRow[];
};

export type FeatureItem = {
  icon: string;
  title: string;
  description: string;
  meta?: string;
};

export type PageCardItem = {
  to: string;
  icon: string;
  title: string;
  description: string;
  preview?: string;
};

export type LayerItem = {
  icon: string;
  title: string;
  question: string;
  bullets: string[];
};

export type ProcessStep = {
  title: string;
  description: string;
};

export type ComparisonItem = {
  label: string;
  signalpulse: string;
  alternative: string;
};

export type DocsSectionItem = {
  title: string;
  description: string;
  links: string[];
};

export type LearnTrack = {
  title: string;
  description: string;
  modules: string[];
};

export type NewsCardItem = {
  title: string;
  preview: string;
  context: string;
  tag: string;
};

export type PageHeroPreview = {
  title: string;
  chips?: string[];
  rows?: PreviewRow[];
};
