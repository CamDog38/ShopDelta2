import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "./shopify.server";

/**
 * GDPR Data Request Webhook
 * 
 * This webhook is called when a customer requests their data.
 * Since ShopDelta doesn't store customer PII, we respond that no data is retained.
 * 
 * Required by Shopify for GDPR compliance.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    // Authenticate webhook using Shopify's built-in verification
    const { payload, topic, shop } = await authenticate.webhook(request);
    
    console.log(`Received ${topic} webhook for ${shop}`);
    console.log("Customer data request payload:", JSON.stringify(payload, null, 2));

    // Log the request for audit purposes
    const customerId = payload.customer?.id;
    const customerEmail = payload.customer?.email;
    
    console.log(`GDPR Data Request - Customer ID: ${customerId}, Email: ${customerEmail}, Shop: ${shop}`);

    // Since ShopDelta only processes analytics data and doesn't store customer PII,
    // we respond that no customer data is retained
    return new Response("No customer data retained. ShopDelta only processes anonymized analytics data.", {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
    
  } catch (error) {
    console.error("Error processing customers/data_request webhook:", error);
    
    // Return 200 to prevent Shopify retries for legitimate requests
    return new Response("No customer data retained.", {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
};
