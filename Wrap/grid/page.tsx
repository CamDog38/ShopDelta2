import { HeatmapGrid } from "../../components/heatmap/HeatmapGrid";
import { buildHeatmapLayout, getHeatmapData } from "../../lib/heatmap";

export default function GridPage() {
  const data = getHeatmapData();
  const tiles = buildHeatmapLayout(data);

  return <HeatmapGrid tiles={tiles} />;
}
