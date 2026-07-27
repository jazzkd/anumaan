/** The single seeded restaurant. Anumaan is multi-tenant in the schema (every
 *  table carries `restaurant_id`) but single-tenant in the demo — hard-coding
 *  the id here keeps the route handlers honest about scoping without spending
 *  hackathon hours on a tenant switcher nobody will score. */
export const RESTAURANT_ID = "11111111-1111-4111-8111-111111111111";

/** Poll interval for every live surface. 2s is the figure the cross-surface
 *  sync requirement is written against (Phase 1 exit: a change in one tab
 *  appears in another within 2s). */
export const LIVE_REFRESH_MS = 2000;
