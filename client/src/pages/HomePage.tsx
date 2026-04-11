import CTASection from "../components/sections/CTASection";
import CorePagesSection from "../components/sections/CorePagesSection";
import HeroSection from "../components/sections/HeroSection";
import HowItWorksSection from "../components/sections/HowItWorksSection";
import ProductLayersSection from "../components/sections/ProductLayersSection";
import SystemOverviewSection from "../components/sections/SystemOverviewSection";
import WhyDifferentSection from "../components/sections/WhyDifferentSection";
import {
  corePages,
  differentiationRows,
  homepageContent,
  processSteps,
  productLayers,
  systemCapabilities,
} from "../data/siteContent";

export default function HomePage() {
  return (
    <>
      <HeroSection content={homepageContent.hero} />
      <SystemOverviewSection {...homepageContent.systemOverview} items={systemCapabilities} cta={homepageContent.systemOverviewCta} />
      <ProductLayersSection {...homepageContent.layers} layers={productLayers} />
      <CorePagesSection {...homepageContent.corePages} pages={corePages} cta={homepageContent.corePagesCta} />
      <HowItWorksSection {...homepageContent.process} steps={processSteps} />
      <WhyDifferentSection {...homepageContent.differentiation} rows={differentiationRows} />
      <CTASection {...homepageContent.finalCta} />
    </>
  );
}



