import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import crypto from "crypto";

// Generate a random share code
function generateShareCode(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let result = "";
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  return result;
}

// Hash password using SHA-256 (simple approach, consider bcrypt for production)
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// GET: List all shares for the current shop
export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  try {
    // Get or create the SApp_Shop record
    let sappShop = await db.sApp_Shop.findUnique({
      where: { shopify_domain: shop },
    });

    if (!sappShop) {
      // Shop not found in SApp tables, return empty list
      return json({ shares: [], shop: null });
    }

    // Get all shares for this shop
    const shares = await db.sApp_WrappedShare.findMany({
      where: { shop_id: sappShop.id },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        share_code: true,
        title: true,
        wrap_mode: true,
        year_a: true,
        year_b: true,
        month: true,
        is_password_protected: true,
        expires_at: true,
        starts_at: true,
        is_active: true,
        is_revoked: true,
        view_count: true,
        last_viewed_at: true,
        created_at: true,
      },
    });

    return json({ shares, shop: sappShop });
  } catch (error) {
    console.error("Error fetching shares:", error);
    return json({ error: "Failed to fetch shares" }, { status: 500 });
  }
}

// POST: Create, update, or delete a share
export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();
  const action = formData.get("action") as string;

  try {
    // Get or create the SApp_Shop record
    let sappShop = await db.sApp_Shop.findUnique({
      where: { shopify_domain: shop },
    });

    if (!sappShop) {
      // Create the shop record
      sappShop = await db.sApp_Shop.create({
        data: {
          shopify_domain: shop,
          shop_name: shop.replace(".myshopify.com", ""),
        },
      });
    }

    switch (action) {
      case "create": {
        const title = formData.get("title") as string;
        const wrapMode = formData.get("wrapMode") as string || "year";
        const yearA = parseInt(formData.get("yearA") as string) || null;
        const yearB = parseInt(formData.get("yearB") as string) || null;
        const month = parseInt(formData.get("month") as string) || null;
        const password = formData.get("password") as string;
        const expiresIn = formData.get("expiresIn") as string; // "1d", "7d", "30d", "never"
        const analyticsData = formData.get("analyticsData") as string;
        const slidesData = formData.get("slidesData") as string;

        // Calculate expiration date
        let expiresAt: Date | null = null;
        if (expiresIn && expiresIn !== "never") {
          const days = parseInt(expiresIn.replace("d", ""));
          expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + days);
        }

        const share = await db.sApp_WrappedShare.create({
          data: {
            shop_id: sappShop.id,
            share_code: generateShareCode(),
            title: title || `${wrapMode === "year" ? yearB : "Monthly"} Wrapped`,
            wrap_mode: wrapMode,
            year_a: yearA,
            year_b: yearB,
            month: month,
            password_hash: password ? hashPassword(password) : null,
            is_password_protected: !!password,
            expires_at: expiresAt,
            analytics_data: analyticsData ? JSON.parse(analyticsData) : null,
            slides_data: slidesData ? JSON.parse(slidesData) : null,
          },
        });

        return json({ success: true, share });
      }

      case "revoke": {
        const shareId = formData.get("shareId") as string;

        await db.sApp_WrappedShare.update({
          where: { id: shareId, shop_id: sappShop.id },
          data: {
            is_revoked: true,
            revoked_at: new Date(),
          },
        });

        return json({ success: true });
      }

      case "delete": {
        const shareId = formData.get("shareId") as string;

        await db.sApp_WrappedShare.delete({
          where: { id: shareId, shop_id: sappShop.id },
        });

        return json({ success: true });
      }

      case "update": {
        const shareId = formData.get("shareId") as string;
        const title = formData.get("title") as string;
        const password = formData.get("password") as string;
        const removePassword = formData.get("removePassword") === "true";
        const expiresIn = formData.get("expiresIn") as string;
        const isActive = formData.get("isActive") === "true";

        const updateData: any = {
          is_active: isActive,
        };

        if (title) updateData.title = title;

        if (removePassword) {
          updateData.password_hash = null;
          updateData.is_password_protected = false;
        } else if (password) {
          updateData.password_hash = hashPassword(password);
          updateData.is_password_protected = true;
        }

        if (expiresIn) {
          if (expiresIn === "never") {
            updateData.expires_at = null;
          } else {
            const days = parseInt(expiresIn.replace("d", ""));
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + days);
            updateData.expires_at = expiresAt;
          }
        }

        await db.sApp_WrappedShare.update({
          where: { id: shareId, shop_id: sappShop.id },
          data: updateData,
        });

        return json({ success: true });
      }

      default:
        return json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error processing share action:", error);
    return json({ error: "Failed to process request" }, { status: 500 });
  }
}
