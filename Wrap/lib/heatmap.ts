export type HeatmapDatum = {
  id: string;
  label: string;
  name: string;
  sector: string;
  value: number; // size / importance (e.g. revenue)
  changePct: number; // -5 .. +5 typical (e.g. % change vs last year)
};

export type HeatmapTile = HeatmapDatum & {
  x: number;      // 0..100 percentage
  y: number;      // 0..100 percentage
  width: number;  // 0..100 percentage
  height: number; // 0..100 percentage
  color: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function getTileColor(changePct: number): string {
  const magnitude = clamp(Math.abs(changePct) / 3, 0, 1);
  const hue = changePct >= 0 ? 140 : 0;
  const saturation = 75;
  const lightness = 20 + (1 - magnitude) * 12;
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

// Squarified treemap algorithm
type Rect = { x: number; y: number; w: number; h: number };
type Node = { datum: HeatmapDatum; value: number };

function squarify(
  nodes: Node[],
  rect: Rect,
  results: { node: Node; rect: Rect }[]
): void {
  if (nodes.length === 0) return;
  if (nodes.length === 1) {
    results.push({ node: nodes[0], rect });
    return;
  }

  // Total value of nodes we're laying out in this rect
  const totalValue = nodes.reduce((s, n) => s + n.value, 0);

  // Find the best row
  let row: Node[] = [];
  let remaining = [...nodes];
  let bestWorst = Infinity;

  for (let i = 1; i <= remaining.length; i++) {
    const testRow = remaining.slice(0, i);
    const rowValue = testRow.reduce((s, n) => s + n.value, 0);
    
    // Calculate aspect ratios for this row configuration
    const rowFraction = rowValue / totalValue;
    const isHorizontal = rect.w >= rect.h;
    const rowSize = isHorizontal ? rect.w * rowFraction : rect.h * rowFraction;
    
    let worst = 0;
    for (const node of testRow) {
      const nodeFraction = node.value / rowValue;
      const nodeSize = isHorizontal ? rect.h * nodeFraction : rect.w * nodeFraction;
      const ratio = Math.max(rowSize / nodeSize, nodeSize / rowSize);
      if (ratio > worst) worst = ratio;
    }

    if (worst <= bestWorst) {
      bestWorst = worst;
      row = testRow;
    } else {
      break; // Adding more nodes makes it worse
    }
  }

  // Layout this row and recurse on remainder
  const rowValue = row.reduce((s, n) => s + n.value, 0);
  const rowFraction = rowValue / totalValue;
  const isHorizontal = rect.w >= rect.h;

  let offset = 0;
  let newRect: Rect;

  if (isHorizontal) {
    const rowWidth = rect.w * rowFraction;
    for (const node of row) {
      const nodeFraction = node.value / rowValue;
      const nodeHeight = rect.h * nodeFraction;
      results.push({
        node,
        rect: { x: rect.x, y: rect.y + offset, w: rowWidth, h: nodeHeight },
      });
      offset += nodeHeight;
    }
    newRect = { x: rect.x + rowWidth, y: rect.y, w: rect.w - rowWidth, h: rect.h };
  } else {
    const rowHeight = rect.h * rowFraction;
    for (const node of row) {
      const nodeFraction = node.value / rowValue;
      const nodeWidth = rect.w * nodeFraction;
      results.push({
        node,
        rect: { x: rect.x + offset, y: rect.y, w: nodeWidth, h: rowHeight },
      });
      offset += nodeWidth;
    }
    newRect = { x: rect.x, y: rect.y + rowHeight, w: rect.w, h: rect.h - rowHeight };
  }

  // Recurse on remaining nodes
  const remainingNodes = nodes.slice(row.length);
  if (remainingNodes.length > 0 && newRect.w > 0.01 && newRect.h > 0.01) {
    squarify(remainingNodes, newRect, results);
  }
}

export function buildHeatmapLayout(data: HeatmapDatum[]): HeatmapTile[] {
  if (!data.length) return [];

  // Sort by value descending for better squarification
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const nodes: Node[] = sorted.map((d) => ({ datum: d, value: d.value }));
  const results: { node: Node; rect: Rect }[] = [];

  // Layout in a 100x100 space (percentages)
  squarify(nodes, { x: 0, y: 0, w: 100, h: 100 }, results);

  return results.map(({ node, rect }) => ({
    ...node.datum,
    x: rect.x,
    y: rect.y,
    width: rect.w,
    height: rect.h,
    color: getTileColor(node.datum.changePct),
  }));
}
