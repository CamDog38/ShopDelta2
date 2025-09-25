import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData, useNavigation, Form } from "@remix-run/react";
import { Page, Layout, Card, Text, Button, InlineStack, BlockStack, Badge } from "@shopify/polaris";

import { authenticate, STARTER_PLAN, PRO_PLAN } from "./shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  // Must be an authenticated admin to choose a plan
  await authenticate.admin(request);
  return json({});
}

export async function action({ request }: ActionFunctionArgs) {
  const { billing } = await authenticate.admin(request);
  const formData = await request.formData();
  const plan = String(formData.get("plan") || "");

  if (plan === "free") {
    // Free plan requires no billing. You can persist selection if you add a table later.
    // For now, just redirect back into the app.
    throw redirect("/app");
  }

  // For paid plans, create a recurring subscription via Shopify Billing API
  try {
    // Map submitted plan slug to configured billing plan keys
    let planKey: typeof STARTER_PLAN | typeof PRO_PLAN | null = null;
    if (plan === "starter") planKey = STARTER_PLAN;
    if (plan === "pro") planKey = PRO_PLAN;

    if (!planKey) {
      return json({ error: "Unknown plan." }, { status: 400 });
    }

    const result = await billing.request({ plan: planKey });

    // Redirect merchant to confirm the subscription
    if (result && (result as any).confirmationUrl) {
      throw redirect((result as any).confirmationUrl as string);
    }

    return json({ error: "Failed to create billing session." }, { status: 500 });
  } catch (e: any) {
    return json({ error: e?.message || "Billing request failed." }, { status: 500 });
  }
}

export default function ChoosePlan() {
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const submitting = nav.state === "submitting";

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
