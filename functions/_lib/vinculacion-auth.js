// Autenticación por cookie firmada para el panel del encargado.
const encoder = new TextEncoder();
export const BASE_HEADERS = {
  'Cache-Control': 'no-store, private',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
};
export const json = (data, status=200, headers={}) => new Response(JSON.stringify(data), {
  status, headers: { ...BASE_HEADERS, 'Content-Type': 'application/json; charset=utf-8', ...headers }
});
const b64url = (arr) => {
  let s=''; for(const b of arr) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
};
const un64 = (s) => {
  const normalized=s.replace(/-/g,'+').replace(/_/g,'/');
  const raw=atob(normalized.padEnd(Math.ceil(normalized.length/4)*4,'='));
  return Uint8Array.from(raw, c=>c.charCodeAt(0));
};
async function hmac(secret, data) {
  const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(data)));
}
// Solo comprueba el login. WF-05 se valida de manera independiente en data.js.
export function configOk(env){
  return Boolean(env.ADMIN_PASSWORD && env.ADMIN_PASSWORD.length >= 12 && env.ADMIN_SESSION_SECRET && env.ADMIN_SESSION_SECRET.length >= 32);
}
export async function verifyPassword(input, real) {
  const a=await crypto.subtle.digest('SHA-256',encoder.encode(String(input)));
  const b=await crypto.subtle.digest('SHA-256',encoder.encode(String(real)));
  const aa=new Uint8Array(a),bb=new Uint8Array(b);
  let diff=0;for(let i=0;i<aa.length;i++) diff |= aa[i]^bb[i];
  return diff===0;
}
export function sameOrigin(req) {
  const origin=req.headers.get('Origin');
  if(!origin) return false;
  try { return new URL(origin).origin===new URL(req.url).origin; }catch{return false;}
}
export async function createSession(secret){
  const payload={sub:'vinculacion',iat:Date.now(),exp:Date.now()+8*60*60*1000};
  const data=b64url(encoder.encode(JSON.stringify(payload)));
  return `${data}.${b64url(await hmac(secret,data))}`;
}
export async function isAdmin(request,env) {
  if(!configOk(env)) return false;
  const cookie=(request.headers.get('Cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('ss_admin='));
  const value=cookie?.slice('ss_admin='.length)||'';
  if(value.length>1000||!value.includes('.')) return false;
  try {
    const [data,signature]=value.split('.');
    if(!data||!signature) return false;
    const expected=await hmac(env.ADMIN_SESSION_SECRET,data);
    const found=un64(signature);
    let diff=expected.length ^ found.length;
    for(let i=0;i<Math.max(expected.length,found.length);i++)diff |= (expected[i]||0)^(found[i]||0);
    if(diff!==0)return false;
    const payload=JSON.parse(new TextDecoder().decode(un64(data)));
    return payload.sub==='vinculacion' && Number.isFinite(payload.exp) && payload.exp>Date.now() && payload.iat<=Date.now()+60000;
  } catch{return false;}
}
export function cookieSet(value){return `ss_admin=${value}; Path=/; Max-Age=28800; HttpOnly; Secure; SameSite=Strict`;}
export function cookieClear(){return 'ss_admin=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict';}
