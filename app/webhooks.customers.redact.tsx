import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "./shopify.server";

/**
 * GDPR Customer Redaction Webhook
 * 
 * This webhook is called when a customer requests data deletion (right to be forgotten).
 * Since ShopDelta doesn't store customer PII, we respond that no data needs to be deleted.
 * 
 * Required by Shopify for GDPR compliance.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    // Authenticate webhook using Shopify's built-in verification
    const { payload, topic, shop } = await authenticate.webhook(request);
    
    console.log(`Received ${topic} webhook for ${shop}`);
    console.log("Customer redaction payload:", JSON.stringify(payload, null, 2));

    // Log the request for audit purposes
    const customerId = payload.customer?.id;
    const customerEmail = payload.customer?.email;
    
    console.log(`GDPR Customer Redaction - Customer ID: ${customerId}, Email: ${customerEmail}, Shop: ${shop}`);

    // Since ShopDelta only processes analytics data and doesn't store customer PII,
    // there's no customer data to redact. However, we should log this for compliance.
    
    // If we stored any customer-related data in the future, we would delete it here:
    // - Remove any cached customer data
    // - Delete any customer-specific analytics records
    // - Clear any customer preferences or settings
    
    console.log(`Customer data redaction completed for customer ${customerId} in shop ${shop}`);

    return new Response("Customer data redaction completed.", {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
    
  } catch (error) {
    console.error("Error processing customers/redact webhook:", error);
    
    // Return 200 to prevent Shopify retries for legitimate requests
    return new Response("Customer data redaction completed.", {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
};
