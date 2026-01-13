import type { LoaderFunctionArgs } from "@remix-run/node";
import { Page, Tabs } from "@shopify/polaris";
import { Outlet, useLocation, useNavigate } from "@remix-run/react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function AdvancedAnalyticsLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const isCampaign = location.pathname.includes("/app/advanced-analytics/campaign");

  const selected = isCampaign ? 1 : 0;

  const tabs = [
    {
      id: "analytics",
      content: "Analytics",
      accessibilityLabel: "Analytics",
      panelID: "analytics-panel",
    },
    {
      id: "campaign-analytics",
      content: "Campaign Analytics",
      accessibilityLabel: "Campaign Analytics",
      panelID: "campaign-analytics-panel",
    },
  ];

  return (
    <Page title="Advanced Analytics">
      <Tabs
        tabs={tabs}
        selected={selected}
        onSelect={(idx) => {
          if (idx === 0) navigate("/app/advanced-analytics/analytics");
          if (idx === 1) navigate("/app/advanced-analytics/campaign");
        }}
      />
      <div style={{ marginTop: 16 }}>
        <Outlet />
      </div>
    </Page>
  );
}
