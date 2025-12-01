import { createClient } from 'npm:@supabase/supabase-js@2.34.0';

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || 'https://nexus-suite-eight.vercel.app';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_KEY') || Deno.env.get('SERVICE_ROLE_KEY') || '';

const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, apikey',
  };
}

function handleOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

function json(body: any, status = 200, extraHeaders: Record<string,string> = {}){
  const headers = new Headers({ 'Content-Type':'application/json', ...corsHeaders() });
  for (const [k,v] of Object.entries(extraHeaders)){
    if (k.toLowerCase() === 'set-cookie'){
      for (const ck of String(v).split(/\r?\n/)){
        if (ck.trim()) headers.append('Set-Cookie', ck.trim());
      }
    } else {
      headers.set(k, v);
    }
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function parseCookies(cookieHeader: string | null){
  const res: Record<string,string> = {};
  if (!cookieHeader) return res;
  for (const part of cookieHeader.split(';')){
    const [k,v] = part.split('=');
    if (!k) continue;
    res[k.trim()] = decodeURIComponent((v||'').trim());
  }
  return res;
}

function setCookieHeaders(access_token: string, refresh_token: string, access_exp?: number, refresh_exp?: number){
  const headers: Record<string,string> = {};
  const now = Math.floor(Date.now()/1000);
  const accessMax = access_exp ? Math.max(0, access_exp - now) : 60*60*24*7;
  const refreshMax = refresh_exp ? Math.max(0, refresh_exp - now) : 30*24*60*60;
  const access = `sb-access-token=${encodeURIComponent(access_token)}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${accessMax}`;
  const refresh = `sb-refresh-token=${encodeURIComponent(refresh_token)}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${refreshMax}`;
  headers['Set-Cookie'] = `${access}\n${refresh}`;
  return headers;
}

async function jwtPayloadFromToken(token: string | undefined){
  if (!token) return null;
  try{
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')));
    return payload;
  } catch (e){ return null; }
}

function nowISO(){ return new Date().toISOString(); }

Deno.serve(async (req)=>{
  const url = new URL(req.url);
  const segments = url.pathname.split('/').filter(Boolean);
  let path = segments.join('/');
  if (segments.length >= 4 && segments[0] === 'functions' && segments[1] === 'v1') {
    // /functions/v1/<slug>/<rest>
    path = segments.slice(3).join('/');
  } else if (segments.length >= 2 && segments[0] === 'api') {
    // /api/<rest>
    path = segments.slice(1).join('/');
  }
  // Now path like "auth/login" or "diagnostics"
  try{
    if (req.method === 'OPTIONS') return handleOptions();

    // utility values (lazily used per route)
    const cookies = parseCookies(req.headers.get('cookie'));
    const accessToken = cookies['sb-access-token'];
    const refreshToken = cookies['sb-refresh-token'];
    const tenantOverride = req.headers.get('x-tenant-id') || url.searchParams.get('organizationId');
    let tenantKey: string | undefined;

    // Diagnostics
    if (path === 'diagnostics' && req.method === 'GET'){
      const info = {
        allowedOrigin: ALLOWED_ORIGIN,
        hasSupabaseUrl: !!SUPABASE_URL,
        hasAnonKey: !!SUPABASE_ANON_KEY,
        hasServiceKey: !!SUPABASE_SERVICE_KEY,
      } as any;
      try{
        const resp = await fetch(`${SUPABASE_URL}/auth/v1/health`, { headers: { apikey: SUPABASE_ANON_KEY } });
        info.authHealth = resp.status;
      } catch(e){ info.authHealth = 0 }
      return json({ success: true, diagnostics: info });
    }

    // Routes
    // POST /auth/login
    if (path === 'auth/login' && req.method === 'POST'){
      const body = await req.json().catch(()=>null);
      if (!body || !body.email || !body.password) return json({ message: 'email and password required' }, 400);
      const { data, error } = await supabaseAnon.auth.signInWithPassword({ email: body.email, password: body.password });
      if (error) return json({ message: error.message || 'invalid credentials' }, 400);
      const session = (data as any)?.session;
      if (!session) return json({ message: 'no session returned' }, 500);
      return json({ success: true, access_token: session.access_token, refresh_token: session.refresh_token, expires_at: session.expires_at, refresh_expires_at: session.refresh_expires_at });
    }

    // GET /auth/user
    if (path === 'auth/user' && req.method === 'GET'){
      const headerAuth = req.headers.get('authorization') || '';
      const bearerMatch = /bearer\s+(.+)/i.exec(headerAuth || '');
      const token = (bearerMatch && bearerMatch[1]) || accessToken;
      if (!token) return json({ message: 'missing access token' }, 401);
      const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY } });
      const user = await resp.json();
      if (!resp.ok) return json({ message: user?.message || 'failed to fetch user' }, resp.status);
      const out = { id: user.id, email: user.email, name: user.user_metadata?.full_name || user.user_metadata?.name || null };
      return json({ success: true, user: out });
    }

    // POST /auth/session/refresh
    if (path === 'auth/session/refresh' && req.method === 'POST'){
      const bodyJson = await req.json().catch(()=>({}));
      const rt = bodyJson.refresh_token || refreshToken;
      if (!rt) return json({ message: 'missing refresh token' }, 401);
      const resp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ refresh_token: rt })
      });
      const data = await resp.json();
      if (!resp.ok) return json({ message: data?.error || 'refresh failed' }, resp.status);
      return json({ success: true, access_token: data.access_token, refresh_token: data.refresh_token, expires_at: data.expires_at, refresh_expires_at: data.refresh_expires_at });
    }

    // GET /wallets
    if (path === 'wallets' && req.method === 'GET'){
      const payload = await jwtPayloadFromToken(accessToken);
      tenantKey = tenantOverride || (payload?.sub || payload?.email);
      if (!tenantKey) return json({ message: 'tenantKey not found' }, 401);
      // Try tenant_id column first
      let { data, error } = await supabaseAnon.from('wallets').select('id, data, created_at, updated_at').eq('tenant_id', tenantKey);
      if (error) return json({ message: error.message }, 500);
      if (!data || data.length === 0){
        // fallback to data->>tenantId
        const q = `data->>\'tenantId\' = '${tenantKey}'`;
        ({ data, error } = await supabaseAnon.from('wallets').select('id, data, created_at, updated_at').filter('data', 'eq', null)); // dummy to keep typing
        // use RPC via raw SQL is not available; instead use .select().match? use .select and filter client-side
        const { data: all, error: allErr } = await supabaseAnon.from('wallets').select('id, data, created_at, updated_at');
        if (allErr) return json({ message: allErr.message }, 500);
        const matched = (all||[]).filter((r:any)=> r.data && r.data.tenantId == tenantKey);
        if (matched.length === 0){
          // try default row: one row where is_default = true or first row
          const { data: def, error: defErr } = await supabaseAnon.from('wallets').select('id, data, created_at, updated_at').eq('is_default', true).limit(1);
          if (defErr) return json({ message: defErr.message }, 500);
          const final = (def && def.length) ? def : (all && all.length ? [all[0]] : []);
          const mapped = final.map((r:any)=>({ id: r.id, tenantId: r.data?.tenantId || tenantKey, name: r.data?.name || null, type: r.data?.type || null, currency: r.data?.currency || null, balance: r.data?.balance || 0, isDefault: !!r.data?.isDefault, createdAt: r.created_at, updatedAt: r.updated_at }));
          return json({ success: true, wallets: mapped });
        }
        const mapped = matched.map((r:any)=>({ id: r.id, tenantId: r.data?.tenantId || tenantKey, name: r.data?.name || null, type: r.data?.type || null, currency: r.data?.currency || null, balance: r.data?.balance || 0, isDefault: !!r.data?.isDefault, createdAt: r.created_at, updatedAt: r.updated_at }));
        return json({ success: true, wallets: mapped });
      }
      const mapped = data.map((r:any)=>({ id: r.id, tenantId: r.data?.tenantId || tenantKey, name: r.data?.name || null, type: r.data?.type || null, currency: r.data?.currency || null, balance: r.data?.balance || 0, isDefault: !!r.data?.isDefault, createdAt: r.created_at, updatedAt: r.updated_at }));
      return json({ success: true, wallets: mapped });
    }

    // GET /matches
    if (path === 'matches' && req.method === 'GET'){
      const payload = await jwtPayloadFromToken(accessToken);
      tenantKey = tenantOverride || (payload?.sub || payload?.email);
      if (!tenantKey) return json({ message: 'tenantKey required' }, 401);
      const { data, error } = await supabaseAnon.from('matches').select('*').eq('tenant_id', tenantKey).order('date', { ascending: false }).limit(200);
      if (error) return json({ message: error.message }, 500);
      return json({ success: true, matches: data });
    }
    // POST /matches
    if (path === 'matches' && req.method === 'POST'){
      const payload = await jwtPayloadFromToken(accessToken);
      tenantKey = tenantOverride || (payload?.sub || payload?.email);
      if (!tenantKey) return json({ message: 'tenantKey required' }, 401);
      const body = await req.json().catch(()=>null);
      if (!body) return json({ message: 'body required' }, 400);
      const toInsert = { ...body, tenant_id: tenantKey, created_at: nowISO(), updated_at: nowISO() };
      const { data, error } = await supabaseAdmin.from('matches').insert(toInsert).select();
      if (error) return json({ message: error.message }, 500);
      return json({ success: true, match: data[0] }, 201);
    }
    // PATCH /matches/:id
    if (path.startsWith('matches/') && req.method === 'PATCH'){
      const id = path.split('/')[1];
      if (!id) return json({ message: 'id required' }, 400);
      const payload = await jwtPayloadFromToken(accessToken);
      tenantKey = tenantOverride || (payload?.sub || payload?.email);
      if (!tenantKey) return json({ message: 'tenantKey required' }, 401);
      const body = await req.json().catch(()=>null);
      if (!body) return json({ message: 'body required' }, 400);
      const toUpdate = { ...body, updated_at: nowISO() };
      const { data, error } = await supabaseAdmin.from('matches').update(toUpdate).eq('id', id).eq('tenant_id', tenantKey).select();
      if (error) return json({ message: error.message }, 500);
      if (!data || data.length===0) return json({ message: 'not found' }, 404);
      return json({ success: true, match: data[0] });
    }

    // Contracts (similar)
    if (path === 'contracts' && req.method === 'GET'){
      const payload = await jwtPayloadFromToken(accessToken);
      tenantKey = tenantOverride || (payload?.sub || payload?.email);
      if (!tenantKey) return json({ message: 'tenantKey required' }, 401);
      const { data, error } = await supabaseAnon.from('contracts').select('*').eq('tenant_id', tenantKey).order('created_at', { ascending: false }).limit(200);
      if (error) return json({ message: error.message }, 500);
      return json({ success: true, contracts: data });
    }
    if (path === 'contracts' && req.method === 'POST'){
      const payload = await jwtPayloadFromToken(accessToken);
      tenantKey = tenantOverride || (payload?.sub || payload?.email);
      if (!tenantKey) return json({ message: 'tenantKey required' }, 401);
      const body = await req.json().catch(()=>null);
      if (!body) return json({ message: 'body required' }, 400);
      const toInsert = { ...body, tenant_id: tenantKey, created_at: nowISO(), updated_at: nowISO() };
      const { data, error } = await supabaseAdmin.from('contracts').insert(toInsert).select();
      if (error) return json({ message: error.message }, 500);
      return json({ success: true, contract: data[0] }, 201);
    }
    if (path.startsWith('contracts/') && req.method === 'PATCH'){
      const id = path.split('/')[1];
      if (!id) return json({ message: 'id required' }, 400);
      const payload = await jwtPayloadFromToken(accessToken);
      tenantKey = tenantOverride || (payload?.sub || payload?.email);
      if (!tenantKey) return json({ message: 'tenantKey required' }, 401);
      const body = await req.json().catch(()=>null);
      if (!body) return json({ message: 'body required' }, 400);
      const toUpdate = { ...body, updated_at: nowISO() };
      const { data, error } = await supabaseAdmin.from('contracts').update(toUpdate).eq('id', id).eq('tenant_id', tenantKey).select();
      if (error) return json({ message: error.message }, 500);
      if (!data || data.length===0) return json({ message: 'not found' }, 404);
      return json({ success: true, contract: data[0] });
    }

    // Team users
    if (path === 'team/users' && req.method === 'GET'){
      const payload = await jwtPayloadFromToken(accessToken);
      tenantKey = tenantOverride || (payload?.sub || payload?.email);
      if (!tenantKey) return json({ message: 'tenantKey required' }, 401);
      const { data, error } = await supabaseAnon.from('staff').select('*').eq('tenant_id', tenantKey).order('created_at', { ascending: false }).limit(200);
      if (error) return json({ message: error.message }, 500);
      return json({ success: true, users: data });
    }
    // Team invites
    if (path === 'team/invites' && req.method === 'GET'){
      const payload = await jwtPayloadFromToken(accessToken);
      tenantKey = tenantOverride || (payload?.sub || payload?.email);
      if (!tenantKey) return json({ message: 'tenantKey required' }, 401);
      const { data, error } = await supabaseAnon.from('invitations').select('*').eq('tenant_id', tenantKey).order('created_at', { ascending: false }).limit(200);
      if (error) return json({ message: error.message }, 500);
      return json({ success: true, invites: data });
    }

    // Tenant members
    if (path === 'tenant/members' && req.method === 'POST'){
      const payload = await jwtPayloadFromToken(accessToken);
      tenantKey = tenantOverride || (payload?.sub || payload?.email);
      if (!tenantKey) return json({ message: 'tenantKey required' }, 401);
      const body = await req.json().catch(()=>null);
      if (!body || !body.email || !body.role) return json({ message: 'email and role required' }, 400);
      const toInsert = { tenant_id: tenantKey, email: body.email, role: body.role, name: body.name || null, created_at: nowISO(), updated_at: nowISO() };
      const { data, error } = await supabaseAdmin.from('tenant_members').insert(toInsert).select();
      if (error) return json({ message: error.message }, 500);
      return json({ success: true, member: data[0] }, 201);
    }
    if (path.startsWith('tenant/members/') && req.method === 'PATCH'){
      const id = path.split('/')[2];
      if (!id) return json({ message: 'id required' }, 400);
      const payload = await jwtPayloadFromToken(accessToken);
      tenantKey = tenantOverride || (payload?.sub || payload?.email);
      if (!tenantKey) return json({ message: 'tenantKey required' }, 401);
      const body = await req.json().catch(()=>null);
      if (!body) return json({ message: 'body required' }, 400);
      const toUpdate = { ...body, updated_at: nowISO() };
      const { data, error } = await supabaseAdmin.from('tenant_members').update(toUpdate).eq('id', id).eq('tenant_id', tenantKey).select();
      if (error) return json({ message: error.message }, 500);
      if (!data || data.length===0) return json({ message: 'not found' }, 404);
      return json({ success: true, member: data[0] });
    }

    return json({ message: 'not found' }, 404);
  } catch (err){
    console.error(err);
    return json({ message: 'internal error' }, 500);
  }
});
