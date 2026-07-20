-- Trigger functions are never called directly; keep them off the RPC surface.
revoke execute on function public.enforce_photo_daily_limit() from public, anon, authenticated;
revoke execute on function public.enforce_premium_brush() from public, anon, authenticated;
