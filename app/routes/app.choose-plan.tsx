import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import ChoosePlan from "../app.choose-plan";
import { authenticate, STARTER_PLAN, PRO_PLAN } from "../shopify.server";
import prisma from "../db.server";

export type ChoosePlanLoaderData = {
  shop: string;
  currentPlanId: string | null;
  currentStatus: string | null;
};

export async function loader({ request }: LoaderFunctionArgs) {
  // Must be an authenticated admin to choose a plan
  const { session } = await authenticate.admin(request);
  const shopDomain = (session as any)?.shop || (session as any)?.dest || "";
  let currentPlanId: string | null = null;
  let currentStatus: string | null = null;
  if (shopDomain) {
    const shop = await prisma.shop.findUnique({
      where: { id: shopDomain },
      include: { subscription_shop_subscription_idTosubscription: true },
    });
    if (shop?.subscription_shop_subscription_idTosubscription) {
      currentPlanId = shop.subscription_shop_subscription_idTosubscription.plan_id as any;
      currentStatus = shop.subscription_shop_subscription_idTosubscription.status as any;
    }
  }
  const data: ChoosePlanLoaderData = { shop: shopDomain, currentPlanId, currentStatus };
  return json(data);
}

export async function action({ request }: ActionFunctionArgs) {
  const { billing, session } = await authenticate.admin(request as any);
  const formData = await request.formData();
  const plan = String(formData.get("plan") || "");
  const shopDomain = (session as any)?.shop || (session as any)?.dest || "";

  if (plan === "free") {
    // Free plan requires no billing. Bypass billing by setting a secure cookie.
    const headers = new Headers();
    headers.append(
      "Set-Cookie",
      [
        `sd_plan=free`,
        `Path=/`,
        `HttpOnly`,
        `Secure`,
        `SameSite=None`,
      ].join("; ")
    );

    if (shopDomain) {
      const planId = "free";
      // Ensure shop exists and points to current plan
      const shop = await prisma.shop.upsert({
        where: { domain: shopDomain },
        create: { id: shopDomain, domain: shopDomain, current_plan_id: planId },
        update: { current_plan_id: planId },
      });
      // Idempotent upsert of free subscription to avoid unique id collisions
      const subId = `${shop.id}::free`;
      const sub = await prisma.subscription.upsert({
        where: { id: subId },
        create: {
          id: subId,
          shop_id: shop.id,
          plan_id: planId,
          status: "ACTIVE" as any,
          is_test: false,
        },
        update: {
          plan_id: planId,
          status: "ACTIVE" as any,
          is_test: false,
        },
      });
      // Set shortcut pointers on Shop
      await prisma.shop.update({
        where: { id: shop.id },
        data: { subscription_id: sub.id },
      });
    }
    throw redirect("/app", { headers });
  }

  try {
    const url = new URL(request.url);
    const returnUrl = `${url.origin}/app/billing/confirm`;
    // Map submitted plan slug to configured billing plan keys
    let planKey: typeof STARTER_PLAN | typeof PRO_PLAN | null = null;
    if (plan === "starter") planKey = STARTER_PLAN;
    if (plan === "pro") planKey = PRO_PLAN;

    if (!planKey) {
      return json({ error: "Unknown plan." }, { status: 400 });
    }

    // Create PENDING subscription record while we send to Shopify billing
    if (shopDomain) {
      const planId = plan === "starter" ? "starter" : "pro";
      await prisma.shop.upsert({
        where: { domain: shopDomain },
        create: { id: shopDomain, domain: shopDomain, current_plan_id: planId },
        update: { current_plan_id: planId },
      });
      await prisma.subscription.upsert({
        where: { id: `${shopDomain}::${plan}` },
        create: {
          id: `${shopDomain}::${plan}`,
          shop_id: shopDomain,
          plan_id: planId,
          status: "PENDING" as any,
          is_test: true,
        },
        update: {
          plan_id: planId,
          status: "PENDING" as any,
        },
      });
    }

    // Debug: log plan and returnUrl before requesting billing
    console.log("[choose-plan action] requesting billing", { plan, mappedPlan: planKey, returnUrl });
    const result = await billing.request({ plan: planKey, returnUrl, /* isTest: true */ });
    // Debug: log if we received a confirmation URL
    const debugUrl = (result as any)?.confirmationUrl as string | undefined;
    console.log("[choose-plan action] billing.request result", { hasUrl: !!debugUrl, confirmationUrl: debugUrl?.slice(0, 120) });

    if (result && (result as any).confirmationUrl) {
      // Clear any Free bypass cookie if present so billing requirements resume
      const headers = new Headers();
      headers.append(
        "Set-Cookie",
        [
          `sd_plan=`,
          `Path=/`,
          `HttpOnly`,
          `Secure`,
          `SameSite=None`,
          `Max-Age=0`,
        ].join("; ")
      );
      return json({ confirmationUrl: (result as any).confirmationUrl as string }, { headers });
    }

    return json({ error: "Failed to create billing session." }, { status: 500 });
  } catch (e: any) {
    return json({ error: e?.message || "Billing request failed." }, { status: 500 });
  }
}

export default ChoosePlan;
