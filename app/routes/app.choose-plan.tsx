import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import ChoosePlan from "../app.choose-plan";
import { authenticate, STARTER_PLAN, PRO_PLAN } from "../shopify.server";

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
    // Free plan requires no billing. Bypass billing by setting a secure cookie.
    const headers = new Headers();
    // Secure cookie; SameSite=None for embedded apps; HttpOnly to avoid JS access
    headers.append(
      "Set-Cookie",
      [
        `sd_plan=free` ,
        `Path=/`,
        `HttpOnly`,
        `Secure`,
        `SameSite=None`,
        // Session cookie (omit Max-Age) or set a duration, e.g., Max-Age=2592000 for 30 days
      ].join("; ")
    );
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

    const result = await billing.request({ plan: planKey, returnUrl, /* isTest: true */ });

    if (result && (result as any).confirmationUrl) {
      throw redirect((result as any).confirmationUrl as string);
    }

    return json({ error: "Failed to create billing session." }, { status: 500 });
  } catch (e: any) {
    return json({ error: e?.message || "Billing request failed." }, { status: 500 });
  }
}

export default ChoosePlan;
