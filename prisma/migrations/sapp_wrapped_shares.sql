-- =====================================================
-- ShopDelta - Shopify App (SApp) Database Schema
-- Wrapped Video Sharing Feature
-- =====================================================

-- Table: SApp_Shops
-- Stores Shopify shop information for the app
CREATE TABLE IF NOT EXISTS "SApp_Shops" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "shopify_domain" VARCHAR(255) NOT NULL UNIQUE,
    "shop_name" VARCHAR(255),
    "currency_code" VARCHAR(10) DEFAULT 'USD',
    "access_token" TEXT,
    "scope" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "installed_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "uninstalled_at" TIMESTAMP WITH TIME ZONE,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups by domain
CREATE INDEX IF NOT EXISTS "idx_sapp_shops_domain" ON "SApp_Shops" ("shopify_domain");

-- Table: SApp_WrappedShares
-- Stores shareable links for Wrapped videos
CREATE TABLE IF NOT EXISTS "SApp_WrappedShares" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "shop_id" UUID NOT NULL REFERENCES "SApp_Shops"("id") ON DELETE CASCADE,
    
    -- Share identification
    "share_code" VARCHAR(32) NOT NULL UNIQUE,
    "title" VARCHAR(255),
    
    -- Wrapped configuration
    "wrap_mode" VARCHAR(20) NOT NULL DEFAULT 'year', -- 'year' or 'month'
    "year_a" INTEGER, -- comparison year (previous)
    "year_b" INTEGER, -- current year
    "month" INTEGER, -- for month mode (1-12)
    
    -- Cached analytics data (JSON blob for fast loading)
    "analytics_data" JSONB,
    "slides_data" JSONB,
    
    -- Access control
    "password_hash" VARCHAR(255), -- bcrypt hash, NULL if no password
    "is_password_protected" BOOLEAN DEFAULT false,
    
    -- Time-based access
    "expires_at" TIMESTAMP WITH TIME ZONE, -- NULL = never expires
    "starts_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Status
    "is_active" BOOLEAN DEFAULT true,
    "is_revoked" BOOLEAN DEFAULT false,
    "revoked_at" TIMESTAMP WITH TIME ZONE,
    
    -- Analytics
    "view_count" INTEGER DEFAULT 0,
    "last_viewed_at" TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    "created_by" VARCHAR(255), -- email or identifier of who created
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for SApp_WrappedShares
CREATE INDEX IF NOT EXISTS "idx_sapp_wrapped_shares_shop" ON "SApp_WrappedShares" ("shop_id");
CREATE INDEX IF NOT EXISTS "idx_sapp_wrapped_shares_code" ON "SApp_WrappedShares" ("share_code");
CREATE INDEX IF NOT EXISTS "idx_sapp_wrapped_shares_active" ON "SApp_WrappedShares" ("is_active", "is_revoked");
CREATE INDEX IF NOT EXISTS "idx_sapp_wrapped_shares_expires" ON "SApp_WrappedShares" ("expires_at") WHERE "expires_at" IS NOT NULL;

-- Table: SApp_WrappedShareViews
-- Tracks individual views of shared Wrapped videos (for analytics)
CREATE TABLE IF NOT EXISTS "SApp_WrappedShareViews" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "share_id" UUID NOT NULL REFERENCES "SApp_WrappedShares"("id") ON DELETE CASCADE,
    
    -- Viewer info (anonymized)
    "viewer_ip_hash" VARCHAR(64), -- hashed IP for uniqueness without storing actual IP
    "user_agent" TEXT,
    "referrer" TEXT,
    "country_code" VARCHAR(2),
    
    -- View details
    "viewed_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "slides_viewed" INTEGER DEFAULT 0, -- how many slides they watched
    "completed" BOOLEAN DEFAULT false, -- watched to the end
    "duration_seconds" INTEGER -- how long they watched
);

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS "idx_sapp_share_views_share" ON "SApp_WrappedShareViews" ("share_id");
CREATE INDEX IF NOT EXISTS "idx_sapp_share_views_date" ON "SApp_WrappedShareViews" ("viewed_at");

-- =====================================================
-- Functions
-- =====================================================

-- Function to generate a unique share code
CREATE OR REPLACE FUNCTION generate_share_code(length INTEGER DEFAULT 12)
RETURNS VARCHAR AS $$
DECLARE
    chars VARCHAR := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    result VARCHAR := '';
    i INTEGER;
BEGIN
    FOR i IN 1..length LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to check if a share is currently valid
CREATE OR REPLACE FUNCTION is_share_valid(share_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    share_record RECORD;
BEGIN
    SELECT * INTO share_record FROM "SApp_WrappedShares" WHERE id = share_id;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Check if active and not revoked
    IF NOT share_record.is_active OR share_record.is_revoked THEN
        RETURN false;
    END IF;
    
    -- Check if started
    IF share_record.starts_at > NOW() THEN
        RETURN false;
    END IF;
    
    -- Check if expired
    IF share_record.expires_at IS NOT NULL AND share_record.expires_at < NOW() THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_share_view(p_share_code VARCHAR)
RETURNS VOID AS $$
BEGIN
    UPDATE "SApp_WrappedShares"
    SET 
        view_count = view_count + 1,
        last_viewed_at = NOW(),
        updated_at = NOW()
    WHERE share_code = p_share_code AND is_active = true AND is_revoked = false;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Triggers
-- =====================================================

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to SApp_Shops
DROP TRIGGER IF EXISTS update_sapp_shops_updated_at ON "SApp_Shops";
CREATE TRIGGER update_sapp_shops_updated_at
    BEFORE UPDATE ON "SApp_Shops"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to SApp_WrappedShares
DROP TRIGGER IF EXISTS update_sapp_wrapped_shares_updated_at ON "SApp_WrappedShares";
CREATE TRIGGER update_sapp_wrapped_shares_updated_at
    BEFORE UPDATE ON "SApp_WrappedShares"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Row Level Security (RLS) Policies
-- Enable RLS for Supabase
-- =====================================================

-- Enable RLS on tables
ALTER TABLE "SApp_Shops" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SApp_WrappedShares" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SApp_WrappedShareViews" ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything
CREATE POLICY "Service role full access on SApp_Shops" ON "SApp_Shops"
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access on SApp_WrappedShares" ON "SApp_WrappedShares"
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access on SApp_WrappedShareViews" ON "SApp_WrappedShareViews"
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy: Anonymous users can view active, non-revoked, non-expired shares
CREATE POLICY "Public can view valid shares" ON "SApp_WrappedShares"
    FOR SELECT
    TO anon
    USING (
        is_active = true 
        AND is_revoked = false 
        AND (starts_at IS NULL OR starts_at <= NOW())
        AND (expires_at IS NULL OR expires_at > NOW())
    );

-- Policy: Anonymous users can insert view records
CREATE POLICY "Public can record views" ON "SApp_WrappedShareViews"
    FOR INSERT
    TO anon
    WITH CHECK (true);
