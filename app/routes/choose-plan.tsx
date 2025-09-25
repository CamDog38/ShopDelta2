import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const search = url.search ? `?${url.searchParams.toString()}` : "";
  return redirect(`/app/choose-plan${search}`);
};

export default function ChoosePlanRedirect() {
  return null;
}
