import CTASection from "../components/sections/CTASection";
import PageContainer from "../components/layout/PageContainer";
import Section from "../components/layout/Section";
import Eyebrow from "../components/ui/Eyebrow";
import Heading from "../components/ui/Heading";
import Lead from "../components/ui/Lead";
import Surface from "../components/layout/Surface";
import { docsSections } from "../data/siteContent";
import type { DocsSectionItem } from "../types/content";

function sectionAnchor(title: string) {
  return title.toLowerCase().replaceAll(" ", "-");
}

export default function DocsPage() {
  return (
    <>
      <Section className="page-hero" density="dense">
        <PageContainer>
          <div className="docs-layout">
            <aside className="docs-sidebar">
              <Surface>
                <nav className="docs-nav" aria-label="Documentation sections">
                  {docsSections.map((section: DocsSectionItem) => (
                    <div key={section.title} className="docs-nav__group">
                      <span className="docs-nav__group-title">{section.title}</span>
                      {section.links.map((link) => (
                        <a key={link} href={`#${sectionAnchor(link)}`} className="docs-nav__link">
                          {link}
                        </a>
                      ))}
                    </div>
                  ))}
                </nav>
              </Surface>
            </aside>
            <article className="docs-article">
              <div className="stack">
                <Eyebrow>Knowledge layer</Eyebrow>
                <Heading level={1}>SignalPulse docs explain the system precisely.</Heading>
                <Lead>Methodology, definitions, and operating assumptions stay readable for beginners while remaining useful to advanced users.</Lead>
              </div>
              {docsSections.map((section: DocsSectionItem) => (
                <Surface key={section.title}>
                  <div className="docs-block" id={sectionAnchor(section.title)}>
                    <Heading level={2}>{section.title}</Heading>
                    <p className="card__description">{section.description}</p>
                    <div className="docs-nav">
                      {section.links.map((link) => (
                        <a key={link} href={`#${sectionAnchor(link)}`} className="docs-nav__link">
                          {link}
                        </a>
                      ))}
                    </div>
                  </div>
                </Surface>
              ))}
            </article>
            <aside className="docs-toc">
              <Surface>
                <div className="docs-nav__group">
                  <span className="docs-nav__group-title">On this page</span>
                  {docsSections.map((section: DocsSectionItem) => (
                    <a key={section.title} href={`#${sectionAnchor(section.title)}`}>
                      {section.title}
                    </a>
                  ))}
                </div>
              </Surface>
            </aside>
          </div>
        </PageContainer>
      </Section>
      <CTASection
        title="Documentation should improve decisions, not bury them."
        description="SignalPulse docs exist to make the platform legible so users can move back into market, signals, and execution with more confidence."
        primary={{ label: "Open Learn", to: "/learn" }}
        secondary={{ label: "Open Market", to: "/market" }}
      />
    </>
  );
}



