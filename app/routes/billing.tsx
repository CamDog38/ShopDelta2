import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  // Preserve all query params (including host)
  const search = url.search ? `?${url.searchParams.toString()}` : "";
  return redirect(`/app/billing${search}`);
};

export default function BillingRedirect() {
  return null;
}
