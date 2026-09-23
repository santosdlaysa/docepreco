import { pool } from '../database/connection';

export const conversionSources = ['recipe_limit', 'recipe_near_limit', 'recipes', 'clientsManagement', 'ordersManagement', 'store', 'stock', 'finance', 'salesTips', 'manual', 'other'] as const;
export const conversionEvents = ['blocked', 'offer_viewed', 'offer_clicked', 'checkout_started'] as const;

// Analytics never prevents a recipe save or checkout. Identity and tier come from the server.
export async function recordConversion(userId: string, event: string, source: string, tier: string, eventId?: string): Promise<void> {
  try {
    await pool.query(`INSERT INTO conversion_events (user_id, event_name, source, target_tier, was_free, event_id)
      SELECT id, $2, $3, $4, NOT (is_premium AND (premium_until IS NULL OR premium_until > NOW())), $5
      FROM users WHERE id = $1 ON CONFLICT (event_id) DO NOTHING`, [userId, event, source, tier, eventId ?? null]);
  } catch (error) {
    console.error('Could not record conversion event', error instanceof Error ? error.message : 'unknown');
  }
}

export const opportunitiesSql = `
WITH free_users AS (
  SELECT u.id, u.company_name, u.email, u.last_seen_at,
    (SELECT COUNT(*)::int FROM recipes r WHERE r.user_id = u.id) AS recipes,
    EXISTS (SELECT 1 FROM premium_events p WHERE p.user_id = u.id AND p.amount_cents > 0
      AND p.source IN ('webhook','pix','stripe') AND p.event_type IN ('INITIAL_PURCHASE','RENEWAL','NON_RENEWING_PURCHASE')) AS former_payer
  FROM users u WHERE COALESCE(u.is_active, TRUE)
    AND NOT (u.is_premium AND (u.premium_until IS NULL OR u.premium_until > NOW()))
    AND u.last_seen_at >= NOW() - INTERVAL '30 days'
), signals AS (
  SELECT user_id,
    BOOL_OR(event_name = 'blocked' AND source = 'recipe_limit') AS blocked,
    BOOL_OR(target_tier = 'master' AND event_name = 'blocked') AS master,
    BOOL_OR(event_name IN ('offer_clicked','checkout_started')) AS interested,
    MAX(created_at) AS last_signal
  FROM conversion_events WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY user_id
), opportunities AS (
  SELECT f.*, COALESCE(s.blocked, FALSE) AS blocked, COALESCE(s.master, FALSE) AS master,
    COALESCE(s.interested, FALSE) AS interested, s.last_signal
  FROM free_users f LEFT JOIN signals s ON s.user_id = f.id
)
SELECT json_build_object(
  'nearLimit', (SELECT COUNT(*) FROM opportunities WHERE recipes = $1 - 1),
  'atLimit', (SELECT COUNT(*) FROM opportunities WHERE recipes >= $1),
  'blocked', (SELECT COUNT(*) FROM opportunities WHERE blocked),
  'masterInterest', (SELECT COUNT(*) FROM opportunities WHERE master),
  'checkoutInterest', (SELECT COUNT(*) FROM opportunities WHERE interested),
  'formerPayers', (SELECT COUNT(*) FROM opportunities WHERE former_payer),
  'distribution', (SELECT COALESCE(json_agg(d ORDER BY d.count), '[]') FROM
    (SELECT recipes AS count, COUNT(*)::int AS users FROM opportunities GROUP BY recipes) d),
  'users', (SELECT COALESCE(json_agg(x), '[]') FROM (
    SELECT id, company_name AS "companyName", email, recipes, blocked, master, interested,
      former_payer AS "formerPayer", last_seen_at AS "lastSeenAt"
    FROM opportunities WHERE recipes >= $1 - 1 OR blocked OR master OR interested OR former_payer
    ORDER BY blocked DESC, interested DESC, master DESC, recipes DESC, last_seen_at DESC LIMIT 50
  ) x)
) AS data`;

// Mature cohorts: first offer in the period, seven complete days of observation.
// A single source receives attribution; renewals and previous payers are excluded.
export const conversionFunnelSql = `
WITH first_payment AS (
  SELECT user_id, MIN(created_at) AS paid_at FROM premium_events
  WHERE amount_cents > 0 AND source IN ('webhook','pix','stripe') AND event_type IN ('INITIAL_PURCHASE','RENEWAL','NON_RENEWING_PURCHASE')
  GROUP BY user_id
), exposures AS (
  SELECT DISTINCT ON (e.user_id) e.user_id, e.source, e.created_at
  FROM conversion_events e LEFT JOIN first_payment p ON p.user_id = e.user_id
  WHERE e.event_name = 'offer_viewed' AND e.was_free
    AND e.created_at >= NOW() - INTERVAL '30 days'
    AND (p.paid_at IS NULL OR p.paid_at > e.created_at)
  ORDER BY e.user_id, e.created_at, e.id
), cohorts AS (
  SELECT e.*, p.paid_at FROM exposures e LEFT JOIN first_payment p ON p.user_id = e.user_id
), activity AS (
  SELECT source,
    COUNT(DISTINCT user_id) FILTER (WHERE event_name = 'blocked')::int AS blocked,
    COUNT(DISTINCT user_id) FILTER (WHERE event_name = 'offer_viewed')::int AS viewed,
    COUNT(DISTINCT user_id) FILTER (WHERE event_name = 'offer_clicked')::int AS clicked,
    COUNT(DISTINCT user_id) FILTER (WHERE event_name = 'checkout_started')::int AS checkout
  FROM conversion_events WHERE was_free AND created_at >= NOW() - INTERVAL '30 days' GROUP BY source
)
SELECT a.*,
  (SELECT COUNT(*)::int FROM cohorts c WHERE c.source = a.source AND c.created_at <= NOW() - INTERVAL '7 days') AS eligible,
  (SELECT COUNT(*)::int FROM cohorts c WHERE c.source = a.source AND c.created_at <= NOW() - INTERVAL '7 days'
    AND c.paid_at <= c.created_at + INTERVAL '7 days') AS converted
FROM activity a ORDER BY a.blocked DESC, a.viewed DESC`;
