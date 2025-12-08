import { useState, useEffect, useRef } from "react";
import { useFetcher } from "@remix-run/react";

type Share = {
  id: string;
  share_code: string;
  title: string | null;
  wrap_mode: string;
  year_a: number | null;
  year_b: number | null;
  month: number | null;
  is_password_protected: boolean;
  expires_at: string | null;
  starts_at: string;
  is_active: boolean;
  is_revoked: boolean;
  view_count: number;
  last_viewed_at: string | null;
  created_at: string;
};

type Props = {
  shares: Share[];
  currentMode: "year" | "month";
  yearA: number;
  yearB: number;
  month?: number;
  analyticsData: any;
  slidesData: any;
  onClose: () => void;
};

export function WrappedShareManager({
  shares,
  currentMode,
  yearA,
  yearB,
  month,
  analyticsData,
  slidesData,
  onClose,
}: Props) {
  const fetcher = useFetcher();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isRevoking, setIsRevoking] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const activeLinksRef = useRef<HTMLDivElement>(null);
  const [newShareTitle, setNewShareTitle] = useState(
    currentMode === "year" ? `${yearB} Year in Review` : `${month ? getMonthName(month) : ""} ${yearB} Wrapped`
  );
  const [newSharePassword, setNewSharePassword] = useState("");
  const [newShareExpiry, setNewShareExpiry] = useState("7d");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const isSubmitting = fetcher.state === "submitting";

  // Track when a new share is created and scroll to it
  useEffect(() => {
    if (fetcher.state === "idle" && isCreating) {
      setIsCreating(false);
      // Scroll to the active links section after a short delay
      setTimeout(() => {
        activeLinksRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
    if (fetcher.state === "idle" && isRevoking) {
      setIsRevoking(null);
    }
    if (fetcher.state === "idle" && isDeleting) {
      setIsDeleting(null);
    }
  }, [fetcher.state, isCreating, isRevoking, isDeleting]);

  function getMonthName(m: number): string {
    return new Date(2000, m - 1, 1).toLocaleString("default", { month: "long" });
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString();
  }

  function getShareUrl(code: string): string {
    // Use window.location.origin in browser, fallback for SSR
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/share/${code}`;
  }

  function copyToClipboard(code: string) {
    navigator.clipboard.writeText(getShareUrl(code));
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  function handleCreateShare() {
    setIsCreating(true);
    fetcher.submit(
      {
        action: "create",
        title: newShareTitle,
        wrapMode: currentMode,
        yearA: yearA.toString(),
        yearB: yearB.toString(),
        month: month?.toString() || "",
        password: newSharePassword,
        expiresIn: newShareExpiry,
        analyticsData: JSON.stringify(analyticsData),
        slidesData: JSON.stringify(slidesData),
      },
      { method: "post", action: "/api/wrapped-share" }
    );
    setShowCreateForm(false);
    setNewSharePassword("");
  }

  function handleRevokeShare(shareId: string) {
    if (confirm("Are you sure you want to revoke this share link? It will no longer be accessible.")) {
      setIsRevoking(shareId);
      fetcher.submit(
        { action: "revoke", shareId },
        { method: "post", action: "/api/wrapped-share" }
      );
    }
  }

  function handleDeleteShare(shareId: string) {
    if (confirm("Are you sure you want to delete this share link? This cannot be undone.")) {
      setIsDeleting(shareId);
      fetcher.submit(
        { action: "delete", shareId },
        { method: "post", action: "/api/wrapped-share" }
      );
    }
  }

  const activeShares = shares.filter((s) => s.is_active && !s.is_revoked);
  const inactiveShares = shares.filter((s) => !s.is_active || s.is_revoked);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Share Your Wrapped</h2>
            <p className="text-sm text-slate-400 mt-1">
              Create shareable links for your Wrapped video
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Create New Share */}
          {!showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full p-4 border-2 border-dashed border-slate-600 rounded-xl text-slate-400 hover:text-white hover:border-slate-500 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create New Share Link
            </button>
          ) : (
            <div className="bg-slate-700/50 rounded-xl p-4 mb-4">
              <h3 className="font-semibold text-white mb-4">New Share Link</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Title</label>
                  <input
                    type="text"
                    value={newShareTitle}
                    onChange={(e) => setNewShareTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 2025 Year in Review"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-1">Password (optional)</label>
                  <input
                    type="password"
                    value={newSharePassword}
                    onChange={(e) => setNewSharePassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Leave empty for no password"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-1">Expires</label>
                  <select
                    value={newShareExpiry}
                    onChange={(e) => setNewShareExpiry(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="1d">1 day</option>
                    <option value="7d">7 days</option>
                    <option value="30d">30 days</option>
                    <option value="90d">90 days</option>
                    <option value="never">Never</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateShare}
                    disabled={isSubmitting || isCreating}
                    className="flex-1 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {(isSubmitting || isCreating) && (
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    )}
                    {(isSubmitting || isCreating) ? "Creating..." : "Create Link"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Active Shares */}
          {activeShares.length > 0 && (
            <div className="mt-6" ref={activeLinksRef}>
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Active Links ({activeShares.length})
              </h3>
              <div className="space-y-3">
                {activeShares.map((share) => (
                  <div
                    key={share.id}
                    className="bg-slate-700/50 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white truncate">
                          {share.title || "Untitled"}
                        </h4>
                        <p className="text-sm text-slate-400 mt-1">
                          {share.view_count} views • Expires {formatDate(share.expires_at)}
                          {share.is_password_protected && " • 🔐 Password protected"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(share.share_code)}
                          className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm"
                        >
                          {copiedCode === share.share_code ? "Copied!" : "Copy Link"}
                        </button>
                        <button
                          onClick={() => handleRevokeShare(share.id)}
                          disabled={isRevoking === share.id}
                          className="px-3 py-1.5 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30 transition-colors text-sm disabled:opacity-50 flex items-center gap-1"
                        >
                          {isRevoking === share.id && (
                            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          )}
                          {isRevoking === share.id ? "Revoking..." : "Revoke"}
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={getShareUrl(share.share_code)}
                        className="flex-1 px-3 py-1.5 bg-slate-600/50 border border-slate-500/50 rounded-lg text-slate-300 text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inactive Shares */}
          {inactiveShares.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Inactive Links ({inactiveShares.length})
              </h3>
              <div className="space-y-3">
                {inactiveShares.map((share) => (
                  <div
                    key={share.id}
                    className="bg-slate-700/30 rounded-xl p-4 opacity-60"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white truncate">
                          {share.title || "Untitled"}
                          {share.is_revoked && (
                            <span className="ml-2 text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">
                              Revoked
                            </span>
                          )}
                        </h4>
                        <p className="text-sm text-slate-400 mt-1">
                          {share.view_count} views • Created {formatDate(share.created_at)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteShare(share.id)}
                        disabled={isDeleting === share.id}
                        className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm disabled:opacity-50 flex items-center gap-1"
                      >
                        {isDeleting === share.id && (
                          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        )}
                        {isDeleting === share.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {shares.length === 0 && !showCreateForm && (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🔗</div>
              <p className="text-slate-400">No share links yet</p>
              <p className="text-slate-500 text-sm mt-1">
                Create a link to share your Wrapped video with others
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
