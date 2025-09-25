import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }
  // No shop param: send visitors to the public landing page
  throw redirect("/public");
};

export default function App() {
  // This route never renders because the loader always redirects.
  return null;
}
