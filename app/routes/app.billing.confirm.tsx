import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Card, BlockStack, Text, Button } from "@shopify/polaris";
import { authenticate, STARTER_PLAN, PRO_PLAN } from "../shopify.server";

type LoaderData = {
  subscriptionName: string;
  subscriptionId: string;
};

// After Shopify redirects back from approving payment, we land here.
// This loader verifies the merchant has an active subscription and returns details,
// allowing the route to render a visible confirmation page.
export async function loader({ request }: LoaderFunctionArgs) {
  const { billing } = await authenticate.admin(request);

  const result = await billing.require({
    plans: [STARTER_PLAN, PRO_PLAN],
    // isTest: true, // Uncomment for test stores/dev
    onFailure: async () => new Response(null, { status: 302, headers: { Location: "/app/choose-plan" } }),
  });

  const sub = result.appSubscriptions?.[0];
  return json<LoaderData>({
    subscriptionName: sub?.name ?? "",
    subscriptionId: sub?.id ?? "",
  });
}

export default function BillingConfirm() {
  const data = useLoaderData<LoaderData>();
  return (
    <Page title="Billing confirmed">
      <Card>
        <div style={{ padding: 24 }}>
          <BlockStack gap="300">
            <Text as="h2" variant="headingLg">✅ Subscription activated</Text>
            {data.subscriptionName ? (
              <Text as="p" variant="bodyMd">Plan: {data.subscriptionName}</Text>
            ) : null}
            <div>
              <a href="/app" style={{ textDecoration: "none" }}>
                <Button>Continue to app</Button>
              </a>
            </div>
          </BlockStack>
        </div>
      </Card>
    </Page>
  );
}
