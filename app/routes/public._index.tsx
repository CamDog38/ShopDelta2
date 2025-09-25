import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";

export const meta: MetaFunction = () => [
  { title: "Public | ShopDelta" },
  { name: "description", content: "Public pages for ShopDelta" },
];

export default function PublicIndex() {
  return (
    <main style={{ padding: "2rem" }}>
      <h1>Public</h1>
      <p>Welcome to the public area of ShopDelta.</p>
      <nav style={{ marginTop: "1rem" }}>
        <ul style={{ lineHeight: 1.8 }}>
          <li>
            <Link to="/public/privacy">Privacy Policy</Link>
          </li>
          <li>
            <Link to="/">Back to App</Link>
          </li>
        </ul>
      </nav>
    </main>
  );
}
