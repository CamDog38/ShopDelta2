import { useActionData, useNavigation, Form } from "@remix-run/react";
import { Page, Layout, Card, Text, Button, InlineStack, BlockStack, Badge } from "@shopify/polaris";
import { useEffect } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { Redirect } from "@shopify/app-bridge/actions";

// Note: This file intentionally contains only the client component to avoid
// importing server-only modules on the client bundle.

export default function ChoosePlan() {
  const actionData = useActionData<{ error?: string; confirmationUrl?: string }>();
  const nav = useNavigation();
  const submitting = nav.state === "submitting";
  const app = useAppBridge();

  useEffect(() => {
    if (actionData && actionData.confirmationUrl && app) {
      // Perform a top-level redirect to Shopify's billing confirmation page
      const redirect = Redirect.create(app);
      redirect.dispatch(Redirect.Action.REMOTE, {
        url: actionData.confirmationUrl,
        newContext: true,
      });
    }
  }, [actionData, app]);

  return (
    <Page title="Choose your plan">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="p" variant="bodyMd">
                Please select a plan to continue. You can start on the Free plan and upgrade later.
              </Text>
              {actionData && (actionData as any).error ? (
                <Text as="p" tone="critical">{(actionData as any).error}</Text>
              ) : null}

              <InlineStack gap="400" wrap>
                <Card roundedAbove="sm">
                  <BlockStack gap="200">
                    <Text as="h2" variant="headingLg">Free</Text>
                    <Text as="p" variant="bodyMd">£0 per month</Text>
                    <Badge tone="success">No trial</Badge>
                    <Text as="p" variant="bodyMd">Feature limits apply. No billing required.</Text>
                    <Form method="post">
                      <input type="hidden" name="plan" value="free" />
                      <Button submit loading={submitting} variant="primary">Choose Free</Button>
                    </Form>
                  </BlockStack>
                </Card>

                <Card roundedAbove="sm">
                  <BlockStack gap="200">
                    <Text as="h2" variant="headingLg">Starter</Text>
                    <Text as="p" variant="bodyMd">$5 / month</Text>
                    <Text as="p" variant="bodyMd">Additional features. Subscription required.</Text>
                    <Form method="post">
                      <input type="hidden" name="plan" value="starter" />
                      <Button submit loading={submitting}>Choose Starter</Button>
                    </Form>
                  </BlockStack>
                </Card>

                <Card roundedAbove="sm">
                  <BlockStack gap="200">
                    <Text as="h2" variant="headingLg">Pro</Text>
                    <Text as="p" variant="bodyMd">$15 / month</Text>
                    <Text as="p" variant="bodyMd">Full features. Subscription required.</Text>
                    <Form method="post">
                      <input type="hidden" name="plan" value="pro" />
                      <Button submit loading={submitting}>Choose Pro</Button>
                    </Form>
                  </BlockStack>
                </Card>
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
