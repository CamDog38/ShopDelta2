import React from "react";
import { Text, InlineStack } from "@shopify/polaris";

export type Filters = {
  view?: string;
  compare?: string;
  compareScope?: string;
  yoyA?: string;
  yoyB?: string;
  yoyMode?: string; // 'monthly' | 'annual'
  yoyYearA?: string;
  yoyYearB?: string;
  yoyYtd?: string; // '1' | 'true'
};

type Props = {
  filters?: Filters;
  isNavLoading: boolean;
  applyPatch: (patch: Record<string, string>) => void;
};

export function YoYControls({ filters, isNavLoading, applyPatch }: Props) {
  // Helper: compute human summary strings to show value immediately
  const ytdOn = !!(filters?.yoyYtd && (filters.yoyYtd === '1' || filters.yoyYtd === 'true'));
  const now = new Date();
  const ytdSuffix = ytdOn
    ? ` • YTD through ${now.toLocaleString('en-US', { month: 'short' })} ${now.getUTCDate()}`
    : '';
  const toYMLabel = (ym?: string) => {
    if (!ym) return '';
    const [y, m] = ym.split('-').map((x)=>parseInt(x,10));
    if (!y || !m) return ym;
    const d = new Date(Date.UTC(y, m-1, 1));
    return `${d.toLocaleString('en-US',{month:'short'})} ${y}`;
  };
  const annualSummary = (() => {
    const a = filters?.yoyYearA || String(new Date().getUTCFullYear() - 1);
    const b = filters?.yoyYearB || String(new Date().getUTCFullYear());
    return `Comparing ${b} vs ${a}${ytdSuffix}`;
  })();
  const monthlySummary = (() => {
    const a = toYMLabel(filters?.yoyA);
    const b = toYMLabel(filters?.yoyB);
    if (a && b) return `Comparing ${b} vs ${a}`;
    return 'Compare any two months across different years. Leave blank to view the default month‑to‑date comparison.';
  })();

  return (
    <div style={{ background: 'var(--p-color-bg-surface-secondary)', padding: '16px', borderRadius: '8px', marginTop: '12px' }}>
      {/* YoY Sub-tabs */}
      <div style={{ marginBottom: '12px' }}>
        <Text as="span" variant="bodySm" tone="subdued">YoY Mode</Text>
        <div style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
          padding: '3px', 
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(102, 126, 234, 0.15)',
          marginTop: '6px'
        }}>
          <InlineStack gap="100">
            <div 
              onClick={() => applyPatch({ view: 'compare', compare: 'yoy', compareScope: (filters?.compareScope as string) || 'aggregate', yoyMode: 'monthly' })}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                background: (filters?.yoyMode || 'monthly') === 'monthly' 
                  ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' 
                  : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                cursor: isNavLoading ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '13px',
                transition: 'all 0.3s ease',
                opacity: isNavLoading ? 0.6 : 1,
                boxShadow: (filters?.yoyMode || 'monthly') === 'monthly' 
                  ? '0 2px 8px rgba(79, 172, 254, 0.4)' 
                  : 'none'
              }}
            >
              YoY (Monthly)
            </div>
            <div 
              onClick={() => applyPatch({ view: 'compare', compare: 'yoy', compareScope: (filters?.compareScope as string) || 'aggregate', yoyMode: 'annual' })}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                background: filters?.yoyMode === 'annual' 
                  ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' 
                  : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                cursor: isNavLoading ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '13px',
                transition: 'all 0.3s ease',
                opacity: isNavLoading ? 0.6 : 1,
                boxShadow: filters?.yoyMode === 'annual' 
                  ? '0 2px 8px rgba(79, 172, 254, 0.4)' 
                  : 'none'
              }}
            >
              YoY (Annual)
            </div>
          </InlineStack>
        </div>
      </div>

      {(filters?.yoyMode || 'monthly') === 'monthly' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text as="span" variant="bodySm" tone="subdued">Year-over-Year Month Selection</Text>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <span className="yoy-readme-trigger" style={{
                background: 'var(--p-color-bg-surface-secondary)',
                color: 'var(--p-color-text-subdued)',
                padding: '2px 8px',
                borderRadius: '999px',
                fontSize: 12,
                cursor: 'default',
                border: '1px solid var(--p-color-border)'
              }}>
                ℹ Read me
              </span>
              <div style={{
                position: 'absolute',
                top: '120%',
                left: 0,
                zIndex: 10,
                width: 360,
                background: 'white',
                color: 'var(--p-color-text)',
                border: '1px solid var(--p-color-border)',
                borderRadius: 8,
                padding: 12,
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                display: 'none'
              }} className="yoy-readme">
                <div style={{ marginBottom: 8 }}>
                  <Text as="p" variant="bodySm"><b>Year-over-Year Month Selection</b></Text>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <Text as="p" variant="bodyXs" tone="subdued">Compare any two months across different years. For example, Jan 2024 vs Jan 2025. This helps you see if growth is consistent month-to-month year over year, not just in total.</Text>
                </div>
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  <li><Text as="span" variant="bodyXs" tone="subdued"><b>Overall Totals</b> → Quick view of your full performance shift.</Text></li>
                  <li><Text as="span" variant="bodyXs" tone="subdued"><b>By Product</b> → See which products drove the change, and spot hidden wins or under-performers.</Text></li>
                </ul>
                <div style={{ marginTop: 8 }}>
                  <Text as="p" variant="bodyXs" tone="subdued">Pick months if you want a specific slice, or leave blank to view the default <b>month‑to‑date</b> comparison.</Text>
                </div>
              </div>
              <style>{`
                .yoy-readme-trigger:hover + .yoy-readme, .yoy-readme:hover { display: block; }
              `}</style>
            </div>
          </div>
          <div style={{ marginTop: '4px' }}>
            <Text as="p" variant="bodyXs" tone="subdued">{monthlySummary}</Text>
          </div>
          <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: 'minmax(180px,1fr) minmax(180px,1fr) auto', gap: '16px', alignItems: 'end' }}>
            <div style={{ minWidth: '180px' }}>
              <Text as="span" variant="bodySm">Month A</Text>
              <input id="yoyA" type="month" defaultValue={filters?.yoyA || ''} title="Previous/base month" style={{ width: '100%', marginTop: '4px', padding: '8px', border: '1px solid var(--p-color-border)', borderRadius: '6px' }} />
              <Text as="span" variant="bodyXs" tone="subdued">Pick any year/month</Text>
            </div>
            <div style={{ minWidth: '180px' }}>
              <Text as="span" variant="bodySm">Month B</Text>
              <input id="yoyB" type="month" defaultValue={filters?.yoyB || ''} title="Current/comparison month" style={{ width: '100%', marginTop: '4px', padding: '8px', border: '1px solid var(--p-color-border)', borderRadius: '6px' }} />
              <Text as="span" variant="bodyXs" tone="subdued">Pick any year/month</Text>
            </div>
            <div>
              <div onClick={() => {
                const a = (document.getElementById('yoyA') as HTMLInputElement | null)?.value || '';
                const b = (document.getElementById('yoyB') as HTMLInputElement | null)?.value || '';
                const scope = (filters?.compareScope as string) || 'aggregate';
                applyPatch({ view: 'compare', compare: 'yoy', compareScope: scope, yoyMode: 'monthly', yoyA: a, yoyB: b });
              }} style={{
                padding: '10px 20px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                color: 'white',
                cursor: isNavLoading ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                border: 'none',
                transition: 'all 0.3s ease',
                opacity: isNavLoading ? 0.6 : 1,
                boxShadow: '0 4px 15px rgba(79, 172, 254, 0.4)'
              }}>
                Update YoY Comparison
              </div>
            </div>
          </div>
        </>
      )}

      {filters?.yoyMode === 'annual' && (
        <>
          <Text as="span" variant="bodySm" tone="subdued">Year vs Year (bypasses top date range)</Text>
          <div style={{ marginTop: '4px' }}>
            <Text as="p" variant="bodyXs" tone="subdued">{annualSummary}. Enable YTD to match Year A to the same period as Year B.</Text>
          </div>
          <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: 'minmax(160px,1fr) minmax(160px,1fr) auto auto', gap: '16px', alignItems: 'end' }}>
            <div style={{ minWidth: '180px' }}>
              <Text as="span" variant="bodySm">Year A (previous)</Text>
              <select id="yoyYearA" defaultValue={filters?.yoyYearA || String(new Date().getUTCFullYear() - 1)} style={{ width: '100%', marginTop: '4px', padding: '8px', border: '1px solid var(--p-color-border)', borderRadius: '6px' }}>
                {Array.from({ length: 10 }).map((_, i) => {
                  const y = new Date().getUTCFullYear() - i;
                  return <option key={y} value={String(y)}>{y}</option>;
                })}
              </select>
            </div>
            <div style={{ minWidth: '180px' }}>
              <Text as="span" variant="bodySm">Year B (current)</Text>
              <select id="yoyYearB" defaultValue={filters?.yoyYearB || String(new Date().getUTCFullYear())} style={{ width: '100%', marginTop: '4px', padding: '8px', border: '1px solid var(--p-color-border)', borderRadius: '6px' }}>
                {Array.from({ length: 10 }).map((_, i) => {
                  const y = new Date().getUTCFullYear() - i;
                  return <option key={y} value={String(y)}>{y}</option>;
                })}
              </select>
            </div>
            <div style={{ alignSelf: 'end', display: 'flex', alignItems: 'center', height: '38px' }}>
              <label className="inline-label" title="When enabled, both years are compared up to the same month and day as Year B (same-period YTD).">
                <input id="yoyYtd" type="checkbox" defaultChecked={!!(filters?.yoyYtd && (filters.yoyYtd === '1' || filters.yoyYtd === 'true'))} />
                <Text as="span" variant="bodySm">Year-to-date</Text>
              </label>
            </div>
            <div>
              <div onClick={() => {
                const yearA = (document.getElementById('yoyYearA') as HTMLSelectElement | null)?.value || '';
                const yearB = (document.getElementById('yoyYearB') as HTMLSelectElement | null)?.value || '';
                const ytd = (document.getElementById('yoyYtd') as HTMLInputElement | null)?.checked ? '1' : '';
                const scope = (filters?.compareScope as string) || 'aggregate';
                applyPatch({ view: 'compare', compare: 'yoy', compareScope: scope, yoyMode: 'annual', yoyYearA: yearA, yoyYearB: yearB, yoyYtd: ytd });
              }} style={{
                padding: '10px 20px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                color: 'white',
                cursor: isNavLoading ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                border: 'none',
                transition: 'all 0.3s ease',
                opacity: isNavLoading ? 0.6 : 1,
                boxShadow: '0 4px 15px rgba(79, 172, 254, 0.4)'
              }}>
                Update Year vs Year
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
