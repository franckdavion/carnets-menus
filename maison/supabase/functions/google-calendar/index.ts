// Maisonnée — Supabase Edge Function google-calendar
// Déployer SANS vérification JWT (Google appelle /callback sans jeton) : supabase functions deploy google-calendar --no-verify-jwt
// Secrets: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET; Supabase defaults: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const origin = 'https://franckdavion.github.io';
const home = `${origin}/carnets-menus/maison/`;
const sbUrl = Deno.env.get('SUPABASE_URL')!;
const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const clientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
const callback = `${sbUrl}/functions/v1/google-calendar/callback`;
const admin = createClient(sbUrl, service, { auth: { persistSession: false } });
const cors = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
const json = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const ub64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - s.length % 4) % 4)), c => c.charCodeAt(0));
const keyPromise = crypto.subtle.importKey('raw', new TextEncoder().encode(clientSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
async function sign(payload: string) { return b64(new Uint8Array(await crypto.subtle.sign('HMAC', await keyPromise, new TextEncoder().encode(payload)))); }
async function userFrom(req: Request) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const sb = createClient(sbUrl, anon, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.getUser(token);
  return error ? null : data.user;
}
async function exchange(params: URLSearchParams) {
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params });
  const data = await r.json();
  if (!r.ok) throw new Error('Google token exchange failed: ' + (data.error || r.status));
  return data;
}
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  const url = new URL(req.url);
  const action = url.pathname.split('/').pop();
  try {
    if (action === 'callback') {
      const state = url.searchParams.get('state') || '';
      const [payload, mac] = state.split('.');
      if (!payload || !mac || !(await crypto.subtle.verify('HMAC', await keyPromise, ub64(mac), new TextEncoder().encode(payload)))) return new Response('Invalid state', { status: 400 });
      const s = JSON.parse(new TextDecoder().decode(ub64(payload)));
      if (!s.uid || !s.exp || s.exp < Date.now() || s.exp > Date.now() + 12 * 60e3) return new Response('Expired state', { status: 400 });
      if (url.searchParams.has('error')) return Response.redirect(home + '?google=cancelled', 302);
      const code = url.searchParams.get('code');
      if (!code) return new Response('Missing code', { status: 400 });
      let t;
      try { t = await exchange(new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: callback, grant_type: 'authorization_code' })); }
      catch (e) { console.error(e); return Response.redirect(home + '?google=error', 302); }
      const { data: old } = await admin.from('google_calendar_tokens').select('refresh_token').eq('user_id', s.uid).maybeSingle();
      const refresh = t.refresh_token || old?.refresh_token;
      if (!refresh) return Response.redirect(home + '?google=missing_refresh', 302);
      const { error } = await admin.from('google_calendar_tokens').upsert({ user_id: s.uid, refresh_token: refresh, access_token: t.access_token, expires_at: new Date(Date.now() + (t.expires_in || 3600) * 1000).toISOString(), updated_at: new Date().toISOString() });
      if (error) { console.error(error); return Response.redirect(home + '?google=error', 302); }
      return Response.redirect(home + '?google=connected', 302);
    }
    const user = await userFrom(req);
    if (!user) return json({ error: 'Unauthorized' }, 401);
    if (action === 'start' && req.method === 'POST') {
      const payload = b64(new TextEncoder().encode(JSON.stringify({ uid: user.id, exp: Date.now() + 10 * 60e3, nonce: crypto.randomUUID() })));
      const state = payload + '.' + await sign(payload);
      const params = new URLSearchParams({ client_id: clientId, redirect_uri: callback, response_type: 'code', access_type: 'offline', prompt: 'consent', scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events', include_granted_scopes: 'true', state });
      return json({ url: 'https://accounts.google.com/o/oauth2/v2/auth?' + params });
    }
    if (action === 'token' && req.method === 'GET') {
      const { data, error } = await admin.from('google_calendar_tokens').select('*').eq('user_id', user.id).maybeSingle();
      if (error) throw error;
      if (!data) return json({ connected: false });
      if (data.access_token && new Date(data.expires_at).getTime() > Date.now() + 120000) return json({ connected: true, access_token: data.access_token, expires_at: data.expires_at });
      let t;
      try { t = await exchange(new URLSearchParams({ refresh_token: data.refresh_token, client_id: clientId, client_secret: clientSecret, grant_type: 'refresh_token' })); }
      catch { return json({ connected: false, error: 'Reconnect Google required' }); }
      const expires_at = new Date(Date.now() + (t.expires_in || 3600) * 1000).toISOString();
      const { error: updateError } = await admin.from('google_calendar_tokens').update({ access_token: t.access_token, expires_at, updated_at: new Date().toISOString() }).eq('user_id', user.id);
      if (updateError) throw updateError;
      return json({ connected: true, access_token: t.access_token, expires_at });
    }
    if (action === 'disconnect' && req.method === 'POST') {
      const { error } = await admin.from('google_calendar_tokens').delete().eq('user_id', user.id);
      if (error) throw error;
      return json({ ok: true });
    }
    return json({ error: 'Not found' }, 404);
  } catch (e) {
    console.error(e);
    return json({ error: 'Internal error' }, 500);
  }
});
