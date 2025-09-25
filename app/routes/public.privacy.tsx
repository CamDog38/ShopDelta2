import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";

export const meta: MetaFunction = () => [
  { title: "Privacy Policy | ShopDelta" },
  { name: "description", content: "ShopDelta Privacy Policy" },
];

export default function PrivacyPolicy() {
  return (
    <main style={{ padding: "2rem", maxWidth: 800 }}>
      <h1>Privacy Policy</h1>
      <p>Last updated: {new Date().getFullYear()}</p>

      <section>
        <h2>Introduction</h2>
        <p>
          We respect your privacy and are committed to protecting it. This page
          outlines how we collect, use, and safeguard your information when you
          use ShopDelta.
        </p>
      </section>

      <section>
        <h2>Information We Collect</h2>
        <ul>
          <li>Account information required to operate the app</li>
          <li>Usage data to improve product reliability</li>
          <li>Support communications you send to us</li>
        </ul>
      </section>

      <section>
        <h2>How We Use Information</h2>
        <ul>
          <li>To provide and maintain the service</li>
          <li>To notify you about changes</li>
          <li>To monitor usage and improve features</li>
        </ul>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          If you have questions about this policy, please contact support.
        </p>
      </section>

      <p style={{ marginTop: "2rem" }}>
        <Link to="/public">Back to Public</Link>
      </p>
    </main>
  );
}
