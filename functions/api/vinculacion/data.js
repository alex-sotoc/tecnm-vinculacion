import {json,isAdmin} from '../../_lib/vinculacion-auth.js';
// URL de n8n de este proyecto: dato público, sin necesidad de variable nueva.
const WF05_URL='https://servicio-social.app.n8n.cloud/webhook/ss-vinculacion-panel';
export async function onRequestGet({request,env}) {
  if(!(await isAdmin(request,env)))return json({ok:false,error:'Inicia sesión para consultar las estadísticas.'},401);
  if(!env.N8N_WEBHOOK_KEY)return json({ok:false,error:'Falta N8N_WEBHOOK_KEY en las variables de PRODUCCION de este nuevo proyecto.',codigo:'CONFIG_WF05'},503);
  const ctrl=new AbortController(); const t=setTimeout(()=>ctrl.abort(),45000);
  try {
    const upstream=await fetch(WF05_URL,{
      method:'GET',signal:ctrl.signal,
      headers:{'X-Automation-Key':env.N8N_WEBHOOK_KEY,'Accept':'application/json'},
      redirect:'error'
    });
    if(!upstream.ok)return json({ok:false,error:`WF-05 respondió HTTP ${upstream.status}. Comprueba que el workflow esté publicado y que Header Auth use exactamente X-Automation-Key y el secreto de este proyecto.`,codigo:'WF05_UPSTREAM'},502);
    const data=await upstream.json();
    if(data?.ok!==true||!Array.isArray(data.estudiantes)||!Array.isArray(data.expedientes)||!Array.isArray(data.documentos))
      return json({ok:false,error:'WF-05 devolvió un formato inesperado. Revisa el nodo Preparar panel.'},502);
    return json(data);
  } catch(error) {
    return json({ok:false,error:error?.name==='AbortError'?'WF-05 tardó demasiado en responder.':'No fue posible consultar WF-05.'},504);
  } finally {clearTimeout(t)}
}
