import { useActionData, useNavigation, Form, useLocation } from "@remix-run/react";
import { Page, Layout, Card, Text, Button, InlineStack, BlockStack, Badge } from "@shopify/polaris";
import { useEffect } from "react";

// Note: This file intentionally contains only the client component to avoid
// importing server-only modules on the client bundle.

export default function ChoosePlan() {
  const actionData = useActionData<{ error?: string; confirmationUrl?: string }>();
  const nav = useNavigation();
  const submitting = nav.state === "submitting";
  const location = useLocation();
  const hostParam = typeof window !== 'undefined' 
    ? (new URLSearchParams(location.search).get('host') ?? '') 
    : '';

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("[ChoosePlan] useEffect fired", { hasActionData: !!actionData, actionData });
    if (actionData && actionData.confirmationUrl && typeof window !== "undefined") {
      try {
        // For App Bridge v4, prefer assign to avoid polluting history in nested frames
        // eslint-disable-next-line no-console
        console.log("[ChoosePlan] Redirecting to confirmationUrl via top.location.assign...", actionData.confirmationUrl);
        (window.top ?? window).location.assign(actionData.confirmationUrl);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[ChoosePlan] top.location.assign failed, trying window.open('_top')", e);
        try {
          window.open(actionData.confirmationUrl, "_top");
        } catch (e2) {
          // eslint-disable-next-line no-console
          console.error("[ChoosePlan] window.open('_top') also failed", e2);
        }
      }
    }
  }, [actionData]);

  return (
    <Page title="Choose your plan">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="p" variant="bodyMd">
                Please select a plan to continue. You can start on the Free plan and upgrade later.
              </Text>
              {actionData && actionData.confirmationUrl ? (
                <Card>
                  <BlockStack gap="200">
                    <Text as="p" variant="bodyMd">Redirecting to Shopify billing confirmation...</Text>
                    <Text as="p" variant="bodySm" tone="subdued">If this does not happen automatically, click the button below.</Text>
                    <Button onClick={() => {
                      try {
                        // eslint-disable-next-line no-console
                        console.log("[ChoosePlan] Manual redirect click: ", actionData.confirmationUrl);
                        (window.top ?? window).location.assign(actionData.confirmationUrl!);
                      } catch (e) {
                        // eslint-disable-next-line no-console
                        console.error("[ChoosePlan] Manual redirect assign failed, using window.open('_top')", e);
                        try {
                          window.open(actionData.confirmationUrl!, "_top");
                        } catch (e2) {
                          // eslint-disable-next-line no-console
                          console.error("[ChoosePlan] Manual redirect window.open failed", e2);
                        }
                      }
                    }}>
                      Continue to Billing Confirmation
                    </Button>
                    <Text as="p" variant="bodySm" tone="subdued">URL: {actionData.confirmationUrl}</Text>
                  </BlockStack>
                </Card>
              ) : null}
              {actionData && (actionData as any).error ? (
                <Text as="p" tone="critical">{(actionData as any).error}</Text>
              ) : null}

              <InlineStack gap="400" wrap>
                <Card roundedAbove="sm">
                  <BlockStack gap="200">
                    <Text as="h2" variant="headingLg">Free</Text>
                    <Text as="p" variant="bodyMd">$0 per month</Text>
                    <Badge tone="success">No trial</Badge>
                    <Text as="p" variant="bodyMd">Feature limits apply. No billing required.</Text>
                    <Form method="post">
                      <input type="hidden" name="plan" value="free" />
                      <input type="hidden" name="host" value={hostParam} />
                      <Button submit loading={submitting} variant="primary">Choose Free</Button>
                    </Form>
                  </BlockStack>
                </Card>

                <div style={{ opacity: 0.5 }}>
                  <Card roundedAbove="sm">
                    <BlockStack gap="200">
                      <Text as="h2" variant="headingLg">Starter</Text>
                      <Text as="p" variant="bodyMd">$5 / month</Text>
                      <Badge tone="attention">Coming soon</Badge>
                      <Text as="p" variant="bodyMd">Additional features. Subscription required.</Text>
                      <Form method="post" onSubmit={(e) => e.preventDefault()}>
                        <input type="hidden" name="plan" value="starter" />
                        <input type="hidden" name="host" value={hostParam} />
                        <Button disabled accessibilityLabel="Coming soon">Coming soon</Button>
                      </Form>
                    </BlockStack>
                  </Card>
                </div>

                <div style={{ opacity: 0.5 }}>
                  <Card roundedAbove="sm">
                    <BlockStack gap="200">
                      <Text as="h2" variant="headingLg">Pro</Text>
                      <Text as="p" variant="bodyMd">$15 / month</Text>
                      <Badge tone="attention">Coming soon</Badge>
                      <Text as="p" variant="bodyMd">Full features. Subscription required.</Text>
                      <Form method="post" onSubmit={(e) => e.preventDefault()}>
                        <input type="hidden" name="plan" value="pro" />
                        <input type="hidden" name="host" value={hostParam} />
                        <Button disabled accessibilityLabel="Coming soon">Coming soon</Button>
                      </Form>
                    </BlockStack>
                  </Card>
                </div>
              </InlineStack>

              <Text as="p" variant="bodySm" tone="subdued">
                Free to install with optional paid plans (Starter, Pro). Zero data retention. All requests are HMAC verified.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
