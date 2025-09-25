import type { HeadersFunction } from "@remix-run/node";

// Build a CSP that works for an embedded Shopify app using App Bridge React v4
// If you deploy behind a different host (e.g., Vercel), 'self' will resolve to that origin.
export function buildSecurityHeaders(): Record<string, string> {
  const isProd = process.env.NODE_ENV === "production";

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    // Shopify Admin embeds the app in an iframe
    "frame-ancestors https://admin.shopify.com https://*.myshopify.com",
    // App Bridge, Shopify assets, your own host for fetches
    `connect-src 'self' https://*.myshopify.com https://admin.shopify.com https://cdn.shopify.com https://*.shopifycloud.com https://*.shopifycdn.com`,
    // App Bridge v4 can inject scripts; Shopify serves many assets from these CDNs
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.shopify.com https://*.shopifycloud.com",
    // Polaris/fonts
    "style-src 'self' 'unsafe-inline' https://cdn.shopify.com https://fonts.googleapis.com",
    "img-src 'self' data: https://cdn.shopify.com https://*.shopifycdn.com",
    "font-src 'self' https://cdn.shopify.com https://fonts.gstatic.com",
    // Allow Shopify Admin frames if any secondary embeds are used (e.g. OAuth)
    "frame-src https://admin.shopify.com https://*.myshopify.com",
    // Allow form posts back to admin when necessary
    "form-action 'self' https://admin.shopify.com https://*.myshopify.com",
  ].join("; ");

  const headers: Record<string, string> = {
    "Content-Security-Policy": csp,
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "ALLOW-FROM https://admin.shopify.com",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
  };

  if (isProd) {
    headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload";
  }

  return headers;
}

// A Remix-compatible headers() export helper
export const remixHeaders: HeadersFunction = ({ loaderHeaders, parentHeaders }) => {
  const sec = buildSecurityHeaders();
  const result: Record<string, string> = {};
  // Start with parent headers so Remix can merge correctly
  parentHeaders.forEach((value, key) => (result[key] = value));
  // Then our security headers
  Object.entries(sec).forEach(([k, v]) => (result[k] = v));
  // Finally any loader headers
  loaderHeaders.forEach((value, key) => (result[key] = value));
  return result;
};
