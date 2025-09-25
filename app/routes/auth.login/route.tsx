import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import {
  AppProvider as PolarisAppProvider,
  Button,
  Card,
  FormLayout,
  Page,
  Text,
  TextField,
} from "@shopify/polaris";
import polarisTranslations from "@shopify/polaris/locales/en.json";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

import { login } from "../../shopify.server";

import { loginErrorMessage } from "./error.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // If we're inside the Shopify Admin iframe, the shop domain comes via header
  const headerShop =
    request.headers.get("X-Shopify-Shop-Domain") ||
    request.headers.get("x-shopify-shop-domain") ||
    "";

  const url = new URL(request.url);
  if (headerShop && !url.searchParams.get("shop")) {
    url.searchParams.set("shop", headerShop);
    const forwarded = new Request(url.toString(), {
      method: request.method,
      headers: request.headers,
    });
    const errors = loginErrorMessage(await login(forwarded));
    return { errors, polarisTranslations };
  }

  const errors = loginErrorMessage(await login(request));

  return { errors, polarisTranslations };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const headerShop =
    request.headers.get("X-Shopify-Shop-Domain") ||
    request.headers.get("x-shopify-shop-domain") ||
    "";

  const url = new URL(request.url);
  if (headerShop && !url.searchParams.get("shop")) {
    url.searchParams.set("shop", headerShop);
    const forwarded = new Request(url.toString(), {
      method: request.method,
      headers: request.headers,
      body: await request.text(),
    });
    const errors = loginErrorMessage(await login(forwarded));
    return { errors };
  }

  const errors = loginErrorMessage(await login(request));

  return {
    errors,
  };
};

export default function Auth() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [shop, setShop] = useState("");
  const { errors } = actionData || loaderData;

  return (
    <PolarisAppProvider i18n={loaderData.polarisTranslations}>
      <Page>
        <Card>
          <Form method="post">
            <FormLayout>
              <Text variant="headingMd" as="h2">
                Log in
              </Text>
              <TextField
                type="text"
                name="shop"
                label="Shop domain"
                helpText="example.myshopify.com"
                value={shop}
                onChange={setShop}
                autoComplete="on"
                error={errors.shop}
              />
              <Button submit>Log in</Button>
            </FormLayout>
          </Form>
        </Card>
      </Page>
    </PolarisAppProvider>
  );
}
