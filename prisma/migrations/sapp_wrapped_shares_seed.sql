-- =====================================================
-- ShopDelta - Sample Data for Testing
-- Run this AFTER the main schema migration
-- =====================================================

-- Note: This is for testing purposes only
-- In production, shops will be created when they install the app

-- Example: Insert a test shop
-- INSERT INTO "SApp_Shops" (shopify_domain, shop_name, currency_code)
-- VALUES ('test-store.myshopify.com', 'Test Store', 'USD');

-- Example: Create a share link for the test shop
-- INSERT INTO "SApp_WrappedShares" (
--     shop_id,
--     share_code,
--     title,
--     wrap_mode,
--     year_a,
--     year_b,
--     expires_at,
--     is_password_protected
-- )
-- SELECT 
--     id,
--     generate_share_code(12),
--     '2025 Year in Review',
--     'year',
--     2024,
--     2025,
--     NOW() + INTERVAL '7 days',
--     false
-- FROM "SApp_Shops" 
-- WHERE shopify_domain = 'test-store.myshopify.com';

-- =====================================================
-- Useful Queries for Management
-- =====================================================

-- Get all active shares for a shop
-- SELECT * FROM "SApp_WrappedShares" 
-- WHERE shop_id = 'your-shop-uuid' 
-- AND is_active = true 
-- AND is_revoked = false
-- ORDER BY created_at DESC;

-- Get share analytics
-- SELECT 
--     ws.share_code,
--     ws.title,
--     ws.view_count,
--     ws.created_at,
--     ws.expires_at,
--     COUNT(wsv.id) as detailed_views,
--     AVG(wsv.duration_seconds) as avg_watch_time
-- FROM "SApp_WrappedShares" ws
-- LEFT JOIN "SApp_WrappedShareViews" wsv ON ws.id = wsv.share_id
-- WHERE ws.shop_id = 'your-shop-uuid'
-- GROUP BY ws.id
-- ORDER BY ws.created_at DESC;

-- Revoke a share
-- UPDATE "SApp_WrappedShares"
-- SET is_revoked = true, revoked_at = NOW()
-- WHERE share_code = 'your-share-code';

-- Delete expired shares (cleanup job)
-- DELETE FROM "SApp_WrappedShares"
-- WHERE expires_at < NOW() - INTERVAL '30 days';

-- Get view statistics by day
-- SELECT 
--     DATE(viewed_at) as view_date,
--     COUNT(*) as views,
--     COUNT(DISTINCT viewer_ip_hash) as unique_viewers
-- FROM "SApp_WrappedShareViews"
-- WHERE share_id = 'your-share-uuid'
-- GROUP BY DATE(viewed_at)
-- ORDER BY view_date DESC;
