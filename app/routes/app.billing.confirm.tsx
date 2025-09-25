import type { LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { authenticate, STARTER_PLAN, PRO_PLAN } from "../shopify.server";

// After Shopify redirects back from approving payment, we land here.
// This loader verifies the merchant has an active subscription.
export async function loader({ request }: LoaderFunctionArgs) {
  const { billing } = await authenticate.admin(request);

  // Require one of our plans; if not present, redirect back to selection.
  const result = await billing.require({
    plans: [STARTER_PLAN, PRO_PLAN],
    // isTest: true, // Uncomment for test stores/dev
    onFailure: async () => redirect("/app/choose-plan"),
  });

  // If we get here, the shop has an active subscription to one of our plans.
  // You can read details if you wish, e.g. result.appSubscriptions[0]
  return redirect("/app");
}

export default function BillingConfirm() {
  // This should never render because the loader redirects, but provide a fallback.
  return null;
}
