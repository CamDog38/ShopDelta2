import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useActionData, Form, useNavigation } from "@remix-run/react";
import { useState, useEffect } from "react";
import db from "../db.server";
import crypto from "crypto";
import { WrapPlayer } from "../../Wrap/components/wrap/WrapPlayer";
import type { Slide } from "../../Wrap/lib/wrapSlides";

// Hash password for comparison
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Hash IP for privacy
function hashIP(ip: string): string {
  return crypto.createHash("sha256").update(ip + "salt_for_privacy").digest("hex");
}

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { code } = params;

  if (!code) {
    return json({ error: "Share code is required", status: 404 }, { status: 404 });
  }

  try {
    const share = await db.sApp_WrappedShare.findUnique({
      where: { share_code: code },
      include: {
        shop: {
          select: {
            shop_name: true,
            currency_code: true,
          },
        },
      },
    });

    if (!share) {
      return json({ error: "Share not found", status: 404 }, { status: 404 });
    }

    // Check if share is valid
    if (!share.is_active) {
      return json({ error: "This share link is no longer active", status: 403 }, { status: 403 });
    }

    if (share.is_revoked) {
      return json({ error: "This share link has been revoked", status: 403 }, { status: 403 });
    }

    const now = new Date();

    if (share.starts_at && share.starts_at > now) {
      return json({ 
        error: "This share link is not yet active", 
        startsAt: share.starts_at,
        status: 403 
      }, { status: 403 });
    }

    if (share.expires_at && share.expires_at < now) {
      return json({ error: "This share link has expired", status: 403 }, { status: 403 });
    }

    // Check if password protected
    if (share.is_password_protected) {
      // Check for password in session/cookie
      const cookieHeader = request.headers.get("Cookie") || "";
      const authCookie = cookieHeader.split(";").find(c => c.trim().startsWith(`share_auth_${code}=`));
      
      if (!authCookie) {
        return json({ 
          requiresPassword: true, 
          title: share.title,
          shopName: share.shop.shop_name,
        });
      }

      const authToken = authCookie.split("=")[1];
      if (authToken !== share.password_hash) {
        return json({ 
          requiresPassword: true, 
          title: share.title,
          shopName: share.shop.shop_name,
          error: "Invalid password",
        });
      }
    }

    // Increment view count
    await db.sApp_WrappedShare.update({
      where: { id: share.id },
      data: {
        view_count: { increment: 1 },
        last_viewed_at: new Date(),
      },
    });

    // Record view
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0] : "unknown";
    
    await db.sApp_WrappedShareView.create({
      data: {
        share_id: share.id,
        viewer_ip_hash: hashIP(ip),
        user_agent: request.headers.get("user-agent") || null,
        referrer: request.headers.get("referer") || null,
      },
    });

    return json({
      share: {
        title: share.title,
        wrapMode: share.wrap_mode,
        yearA: share.year_a,
        yearB: share.year_b,
        month: share.month,
      },
      shopName: share.shop.shop_name,
      currencyCode: share.shop.currency_code,
      slides: share.slides_data as Slide[] || [],
      analyticsData: share.analytics_data,
    });
  } catch (error) {
    console.error("Error loading share:", error);
    return json({ error: "Failed to load share", status: 500 }, { status: 500 });
  }
}

export async function action({ params, request }: ActionFunctionArgs) {
  const { code } = params;
  const formData = await request.formData();
  const password = formData.get("password") as string;

  if (!code || !password) {
    return json({ error: "Password is required" }, { status: 400 });
  }

  try {
    const share = await db.sApp_WrappedShare.findUnique({
      where: { share_code: code },
    });

    if (!share || !share.password_hash) {
      return json({ error: "Invalid share" }, { status: 404 });
    }

    const hashedPassword = hashPassword(password);
    
    if (hashedPassword !== share.password_hash) {
      return json({ error: "Incorrect password" }, { status: 401 });
    }

    // Return success with auth cookie
    return json(
      { success: true },
      {
        headers: {
          "Set-Cookie": `share_auth_${code}=${hashedPassword}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
        },
      }
    );
  } catch (error) {
    console.error("Error verifying password:", error);
    return json({ error: "Failed to verify password" }, { status: 500 });
  }
}

export default function SharePage() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [password, setPassword] = useState("");

  // Reload page after successful password submission
  useEffect(() => {
    if (actionData?.success) {
      window.location.reload();
    }
  }, [actionData]);

  // Error states
  if (data.error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-slate-400">{data.error}</p>
          {data.startsAt && (
            <p className="text-slate-500 mt-2">
              Available from: {new Date(data.startsAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Password required
  if (data.requiresPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎬</div>
            <h1 className="text-2xl font-bold text-white mb-2">{data.title || "Wrapped Video"}</h1>
            {data.shopName && (
              <p className="text-slate-400">by {data.shopName}</p>
            )}
          </div>

          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
            <div className="text-center mb-4">
              <div className="text-3xl mb-2">🔐</div>
              <p className="text-slate-300">This video is password protected</p>
            </div>

            <Form method="post" className="space-y-4">
              <div>
                <input
                  type="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              {(actionData?.error || data.error) && (
                <p className="text-red-400 text-sm text-center">
                  {actionData?.error || data.error}
                </p>
              )}

              <button
                type="submit"
                disabled={navigation.state === "submitting"}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all disabled:opacity-50"
              >
                {navigation.state === "submitting" ? "Verifying..." : "View Wrapped"}
              </button>
            </Form>
          </div>
        </div>
      </div>
    );
  }

  // Show the Wrapped video
  if (data.slides && data.slides.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
        <div className="max-w-4xl mx-auto">
          <WrapPlayer slides={data.slides} autoAdvanceMs={6500} />
        </div>
        
        {/* Footer */}
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 text-center">
          <p className="text-slate-500 text-xs">
            Powered by ShopDelta
          </p>
        </div>
      </div>
    );
  }

  // No slides available
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="text-6xl mb-4">📊</div>
        <h1 className="text-2xl font-bold text-white mb-2">No Data Available</h1>
        <p className="text-slate-400">This Wrapped video doesn't have any slides yet.</p>
      </div>
    </div>
  );
}
