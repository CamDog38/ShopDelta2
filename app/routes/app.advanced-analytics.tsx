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
      <div
        style={{
          background: "linear-gradient(135deg, rgba(102,126,234,0.12) 0%, rgba(118,75,162,0.12) 100%)",
          border: "1px solid var(--p-color-border)",
          borderRadius: 12,
          padding: 12,
        }}
      >
        <Tabs
          tabs={tabs}
          selected={selected}
          onSelect={(idx) => {
            if (idx === 0) navigate("/app/advanced-analytics/analytics");
            if (idx === 1) navigate("/app/advanced-analytics/campaign");
          }}
        />
      </div>
      <div style={{ marginTop: 16 }}>
        <Outlet />
      </div>
    </Page>
  );
}
