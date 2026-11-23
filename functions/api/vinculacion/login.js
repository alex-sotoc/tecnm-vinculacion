import {json,configOk,verifyPassword,sameOrigin,createSession,cookieSet} from '../../_lib/vinculacion-auth.js';
export async function onRequestPost({request,env}) {
  if(!configOk(env)) return json({ok:false,error:'El acceso del encargado aún no está configurado.'},503);
  if(!sameOrigin(request)) return json({ok:false,error:'Origen no permitido.'},403);
  if(!(request.headers.get('content-type')||'').includes('application/json'))return json({ok:false,error:'Se requiere JSON.'},415);
  if(Number(request.headers.get('content-length')||0)>2048)return json({ok:false,error:'Solicitud demasiado grande.'},413);
  let body;try{body=await request.json();}catch{return json({ok:false,error:'Solicitud inválida.'},400)}
  const username=String(body?.usuario||'').trim().toLowerCase();
  const pass=String(body?.password||'');
  if(pass.length>256)return json({ok:false,error:'Credenciales incorrectas.'},401);
  const good=await verifyPassword(pass,env.ADMIN_PASSWORD);
  if(username!=='vinculacion'||!good)return json({ok:false,error:'Usuario o contraseña incorrectos.'},401);
  const session=await createSession(env.ADMIN_SESSION_SECRET);
  return json({ok:true,usuario:'vinculacion'},200,{'Set-Cookie':cookieSet(session)});
}
export function onRequestGet(){return json({ok:false,error:'Usa POST.'},405)}
