import crypto from "node:crypto";

/**
 * Compute the HMAC SHA256 digest and compare with Shopify header
 */
export async function verifyWebhookRequest(request: Request): Promise<{ isValid: boolean; rawBody: string }> {
  // Read the raw body as text (Shopify signs the raw payload)
  const rawBody = await request.text();

  const hmacHeader = request.headers.get("x-shopify-hmac-sha256") || "";
  const secret = process.env.SHOPIFY_API_SECRET || "";

  // Compute HMAC using the app secret
  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  const isValid = crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader || ""));

  return { isValid, rawBody };
}

export function createGDPRResponse(message: string): Response {
  return new Response(message, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      // Explicitly disable caching for webhook responses
      "cache-control": "no-store",
    },
  });
}
