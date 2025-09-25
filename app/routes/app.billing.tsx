import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Card, BlockStack, Text, InlineStack, Button, Link as PolarisLink } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export type LoaderData = {
  shop: string;
  planKey: string | null;
  planName: string | null;
  status: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  isTest: boolean;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = (session as any)?.shop || (session as any)?.dest || "";

  // Find latest ACTIVE subscription for this shop
  const sub = await prisma.subscription.findFirst({
    where: { shop_id: shopDomain, status: "ACTIVE" as any },
    orderBy: { created_at: "desc" },
    include: { plan: true },
  });

  const data: LoaderData = {
    shop: shopDomain,
    planKey: sub?.plan?.key ?? null,
    planName: sub?.plan?.name ?? null,
    status: sub?.status ?? null,
    currentPeriodStart: sub?.current_period_start ? sub.current_period_start.toISOString() : null,
    currentPeriodEnd: sub?.current_period_end ? sub.current_period_end.toISOString() : null,
    isTest: Boolean(sub?.is_test),
  };

  return json(data);
};

export default function BillingPage() {
  const data = useLoaderData<typeof loader>();

  return (
    <Page title="Billing">
      <BlockStack gap="400">
        <Card>
          <BlockStack gap="200">
            <Text as="h2" variant="headingLg">Current Plan</Text>
            {data.planName ? (
              <BlockStack gap="100">
                <InlineStack gap="400" align="space-between">
                  <Text as="p" variant="bodyLg">{data.planName} {data.isTest ? "(Test)" : ""}</Text>
                  <Text as="p" variant="bodyMd" tone="subdued">Status: {data.status ?? "Unknown"}</Text>
                </InlineStack>
                <Text as="p" variant="bodyMd" tone="subdued">
                  {data.currentPeriodStart && data.currentPeriodEnd ? (
                    <>Current period: {new Date(data.currentPeriodStart).toLocaleString()} → {new Date(data.currentPeriodEnd).toLocaleString()}</>
                  ) : (
                    <>Current period: not available</>
                  )}
                </Text>
              </BlockStack>
            ) : (
              <Text as="p" tone="subdued">No active subscription found. Choose a plan to get started.</Text>
            )}
          </BlockStack>
        </Card>
        <Card>
          <BlockStack gap="200">
            <Text as="h2" variant="headingLg">Manage</Text>
            <Text as="p" tone="subdued">To change your plan, go to the plan selection screen.</Text>
            <PolarisLink url="/app/choose-plan">Open plan selection</PolarisLink>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
