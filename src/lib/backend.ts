// Backend namespace. Trace currently co-tenants the DigiRaftHub Supabase
// project (free-tier project cap), so every DB object is trace_-prefixed and
// realtime topics use the `trace:` prefix. To move to a dedicated project
// later: run supabase/migrations/20260716000001_init.sql there, strip the
// prefixes below, and point .env at the new project.
export const TABLES = {
  couples: 'trace_couples',
  members: 'trace_members',
  canvases: 'trace_canvases',
  strokes: 'trace_strokes',
  dailyMarks: 'trace_daily_marks',
  pushTokens: 'trace_push_tokens',
} as const;

export const RPCS = {
  createCouple: 'trace_create_couple',
  joinCouple: 'trace_join_couple',
} as const;

export const EDGE_FUNCTIONS = {
  notifyPartner: 'trace-notify-partner',
} as const;

export const BUCKETS = {
  photos: 'trace-photos',
} as const;

export const coupleChannel = (coupleId: string) => `trace:couple:${coupleId}`;
