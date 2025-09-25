import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { authenticate, STARTER_PLAN, PRO_PLAN } from "../shopify.server";
import prisma from "../db.server";

// After Shopify redirects back from approving payment, we land here.
// This loader verifies the merchant has an active subscription.
export async function loader({ request }: LoaderFunctionArgs) {
  const { billing, session } = await authenticate.admin(request);

  // Require one of our plans; if not present, redirect back to selection.
  const result = await billing.require({
    plans: [STARTER_PLAN, PRO_PLAN],
    // isTest: true, // Uncomment for test stores/dev
    onFailure: async () => redirect("/app/choose-plan"),
  });

  // If we get here, the shop has an active subscription to one of our plans.
  // Persist ACTIVE status in DB for current shop and set as current subscription.
  const shopDomain = (session as any)?.shop || (session as any)?.dest || "";
  if (shopDomain) {
    // Find most recent PENDING subscription for this shop and mark ACTIVE
    const pending = await prisma.subscription.findFirst({
      where: { shop_id: shopDomain, status: "PENDING" as any },
      orderBy: { created_at: "desc" },
    });
    if (pending) {
      const active = await prisma.subscription.update({
        where: { id: pending.id },
        data: {
          status: "ACTIVE" as any,
          // Optionally set current period dates if you query Shopify for them later
        },
      });
      await prisma.shop.upsert({
        where: { id: shopDomain },
        create: { id: shopDomain, domain: shopDomain, subscription_id: active.id },
        update: { subscription_id: active.id },
      });
    }
  }

  // Clear any free-bypass cookie if it exists
  const headers = new Headers();
  headers.append(
    "Set-Cookie",
    [
      "sd_plan=",
      "Path=/",
      "Max-Age=0",
      "HttpOnly",
      "Secure",
      "SameSite=None",
    ].join("; ")
  );

  return redirect("/app", { headers });
}

export default function BillingConfirm() {
  // This should never render because the loader redirects, but provide a fallback.
  return null;
}
