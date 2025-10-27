import { SkeletonBodyText, SkeletonDisplayText, Card, BlockStack, Box } from "@shopify/polaris";

export function AnalyticsLoadingSkeleton() {
  return (
    <BlockStack gap="400">
      {/* Filters skeleton */}
      <Card>
        <BlockStack gap="300">
          <SkeletonDisplayText size="small" />
          <Box paddingBlockStart="200">
            <SkeletonBodyText lines={2} />
          </Box>
        </BlockStack>
      </Card>

      {/* Chart skeleton */}
      <Card>
        <BlockStack gap="300">
          <SkeletonDisplayText size="small" />
          <Box paddingBlockStart="400">
            <div style={{ height: '300px', background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
          </Box>
        </BlockStack>
      </Card>

      {/* Table skeleton */}
      <Card>
        <BlockStack gap="300">
          <SkeletonDisplayText size="small" />
          <Box paddingBlockStart="200">
            <SkeletonBodyText lines={8} />
          </Box>
        </BlockStack>
      </Card>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </BlockStack>
  );
}

export function UTMLoadingSkeleton() {
  return (
    <BlockStack gap="400">
      {/* Filters skeleton */}
      <div style={{ background: 'var(--p-color-bg-surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--p-color-border)' }}>
        <SkeletonDisplayText size="small" />
        <Box paddingBlockStart="300">
          <SkeletonBodyText lines={2} />
        </Box>
      </div>

      {/* UTM table skeleton */}
      <div style={{ background: 'var(--p-color-bg-surface)', padding: '24px', borderRadius: '12px', border: '1px solid var(--p-color-border)' }}>
        <SkeletonDisplayText size="small" />
        <Box paddingBlockStart="400">
          <SkeletonBodyText lines={10} />
        </Box>
      </div>

      {/* Products section skeleton */}
      <div style={{ background: 'var(--p-color-bg-surface)', padding: '24px', borderRadius: '12px', border: '1px solid var(--p-color-border)' }}>
        <SkeletonDisplayText size="small" />
        <Box paddingBlockStart="300">
          <SkeletonBodyText lines={3} />
        </Box>
      </div>
    </BlockStack>
  );
}
