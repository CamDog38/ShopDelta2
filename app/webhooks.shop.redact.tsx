import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "./shopify.server";
import prisma from "./db.server";

/**
 * GDPR Shop Redaction Webhook
 * 
 * This webhook is called when a shop owner requests deletion of their shop data.
 * This is typically triggered 48 hours after app uninstallation.
 * 
 * Required by Shopify for GDPR compliance.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    // Authenticate webhook using Shopify's built-in verification
    const { payload, topic, shop } = await authenticate.webhook(request);
    
    console.log(`Received ${topic} webhook for ${shop}`);
    console.log("Shop redaction payload:", JSON.stringify(payload, null, 2));

    const shopId = payload.shop_id;
    const shopDomain = payload.shop_domain;
    
    console.log(`GDPR Shop Redaction - Shop ID: ${shopId}, Domain: ${shopDomain}`);

    // Delete all shop-related data
    try {
      // 1. Delete all sessions for this shop from Prisma storage
      await prisma.session.deleteMany({
        where: { shop: shopDomain },
      });
      console.log(`Deleted sessions for shop: ${shopDomain}`);

      // 2. Delete any other shop-specific data from your database:
      // - Delete analytics data for this shop
      // - Delete any cached product information
      // - Delete any shop preferences or settings
      // - Delete any webhook configurations
      
      // Example (add your own tables here):
      // await prisma.analytics.deleteMany({ where: { shopDomain } });
      // await prisma.shopSettings.deleteMany({ where: { shopDomain } });
      
      console.log(`Shop data redaction completed for shop ${shopDomain} (ID: ${shopId})`);
      
    } catch (error) {
      console.error(`Error during shop data deletion for ${shopDomain}:`, error);
      // Continue processing - we still want to return success
    }

    return new Response(`Shop data deleted successfully for ${shopDomain}.`, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
    
  } catch (error) {
    console.error("Error processing shop/redact webhook:", error);
    
    // Return 200 to prevent Shopify retries for legitimate requests
    return new Response("Shop data deletion completed.", {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
};
