import PageContainer from "../layout/PageContainer";
import Section from "../layout/Section";
import SectionHeader from "../layout/SectionHeader";
import Grid from "../layout/Grid";
import LayerCard from "../cards/LayerCard";
import type { LayerItem } from "../../types/content";

type ProductLayersSectionProps = {
  eyebrow: string;
  title: string;
  lead: string;
  layers: LayerItem[];
};

export default function ProductLayersSection({ eyebrow, title, lead, layers }: ProductLayersSectionProps) {
  return (
    <Section density="dense">
      <PageContainer>
        <SectionHeader eyebrow={eyebrow} title={title} lead={lead} />
        <Grid columns={2}>
          {layers.map((layer) => (
            <LayerCard key={layer.title} {...layer} />
          ))}
        </Grid>
      </PageContainer>
    </Section>
  );
}



