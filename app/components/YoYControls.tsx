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
          <Text as="span" variant="bodySm" tone="subdued">Year-over-Year Month Selection (optional)</Text>
          <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '16px', alignItems: 'end' }}>
            <div style={{ minWidth: '180px' }}>
              <Text as="span" variant="bodySm">Month A</Text>
              <input id="yoyA" type="month" defaultValue={filters?.yoyA || ''} style={{ width: '100%', marginTop: '4px', padding: '8px', border: '1px solid var(--p-color-border)', borderRadius: '6px' }} />
              <Text as="span" variant="bodyXs" tone="subdued">Pick any year/month</Text>
            </div>
            <div style={{ minWidth: '180px' }}>
              <Text as="span" variant="bodySm">Month B</Text>
              <input id="yoyB" type="month" defaultValue={filters?.yoyB || ''} style={{ width: '100%', marginTop: '4px', padding: '8px', border: '1px solid var(--p-color-border)', borderRadius: '6px' }} />
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
          <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '16px', alignItems: 'end' }}>
            <div style={{ minWidth: '160px' }}>
              <Text as="span" variant="bodySm">Year A (previous)</Text>
              <select id="yoyYearA" defaultValue={filters?.yoyYearA || String(new Date().getUTCFullYear() - 1)} style={{ width: '100%', marginTop: '4px', padding: '8px', border: '1px solid var(--p-color-border)', borderRadius: '6px' }}>
                {Array.from({ length: 10 }).map((_, i) => {
                  const y = new Date().getUTCFullYear() - i;
                  return <option key={y} value={String(y)}>{y}</option>;
                })}
              </select>
            </div>
            <div style={{ minWidth: '160px' }}>
              <Text as="span" variant="bodySm">Year B (current)</Text>
              <select id="yoyYearB" defaultValue={filters?.yoyYearB || String(new Date().getUTCFullYear())} style={{ width: '100%', marginTop: '4px', padding: '8px', border: '1px solid var(--p-color-border)', borderRadius: '6px' }}>
                {Array.from({ length: 10 }).map((_, i) => {
                  const y = new Date().getUTCFullYear() - i;
                  return <option key={y} value={String(y)}>{y}</option>;
                })}
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
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
