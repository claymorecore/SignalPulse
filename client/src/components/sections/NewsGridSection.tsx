import PageContainer from "../layout/PageContainer";
import Section from "../layout/Section";
import SectionHeader from "../layout/SectionHeader";
import Card from "../cards/Card";
import Badge from "../feedback/Badge";
import type { NewsCardItem } from "../../types/content";

type NewsGridSectionProps = {
  eyebrow: string;
  title: string;
  lead: string;
  items: NewsCardItem[];
};

export default function NewsGridSection({ eyebrow, title, lead, items }: NewsGridSectionProps) {
  return (
    <Section>
      <PageContainer>
        <SectionHeader eyebrow={eyebrow} title={title} lead={lead} />
        <div className="news-grid">
          {items.map((item) => (
            <Card key={item.title}>
              <Badge>{item.tag}</Badge>
              <div className="card__header">
                <h3 className="card__title">{item.title}</h3>
                <p className="card__description">{item.preview}</p>
              </div>
              <p className="card__meta">{item.context}</p>
            </Card>
          ))}
        </div>
      </PageContainer>
    </Section>
  );
}



