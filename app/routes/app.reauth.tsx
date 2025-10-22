import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

// Helper route to perform a safe top-level redirect to auth
// Usage: /app/reauth?host=...&shop=...&reinstall=1
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || "";
  const host = url.searchParams.get("host") || "";
  const reinstall = url.searchParams.get("reinstall") || "";

  const target = new URL("/auth/login", url.origin);
  if (shop) target.searchParams.set("shop", shop);
  if (host) target.searchParams.set("host", host);
  if (reinstall) target.searchParams.set("reinstall", reinstall);

  return redirect(target.toString());
};
