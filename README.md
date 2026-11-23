# Portal independiente de Vinculación · TecNM Campus Matehuala

Esta carpeta es **un repositorio completo**, distinto del portal estudiantil. Incluye:

- `index.html`, `styles.css`, `app.js`, `pdf.js`: interfaz y descarga directa del reporte PDF, sin bibliotecas externas.
- `functions/_lib/vinculacion-auth.js`: sesiones firmadas con cookie HttpOnly.
- `functions/api/vinculacion/login.js`, `session.js`, `logout.js`, `data.js`: login y consulta autenticada a WF-05.
- La conexión utiliza el **WF-05 que ya tienes** en n8n: no es necesario importarlo de nuevo.

## 1) Crear un repositorio nuevo en GitHub

1. Entra a https://github.com y accede a tu cuenta.
2. Pulsa el icono `+` arriba a la derecha y luego **New repository**. También puedes abrir https://github.com/new.
3. Nombre sugerido: `tecnm-vinculacion`. Elige **Private** si tu plan y configuración de Cloudflare permiten conectar el repositorio privado (GitHub acepta repositorios privados para la integración).
4. Marca **Add a README file** solo si deseas hacerlo; este ZIP ya incluye README.md. Para evitar conflictos, mejor **no** marques README.
5. Pulsa **Create repository**.
6. En el repositorio vacío pulsa **uploading an existing file** (o **Add file → Upload files**).
7. **Extrae el ZIP primero**, abre la carpeta extraída y arrastra el CONTENIDO (index.html, styles.css, app.js, pdf.js y functions/) a GitHub. **No arrastres la carpeta exterior como una única carpeta anidada**. `index.html` debe quedar visible en la raíz.
8. Pulsa **Commit changes**. Elige la rama `main` como rama de producción.

## 2) Crear otro proyecto de Cloudflare Pages

1. En https://dash.cloudflare.com entra a **Workers & Pages**.
2. Elige **Create application** (o Create) → **Pages** → **Connect to Git**. Si aparece una interfaz que comienza con Workers, busca la alternativa Pages.
3. Selecciona GitHub, autoriza el repositorio nuevo si es necesario y elige `tecnm-vinculacion`.
4. Elige un nombre de proyecto disponible, por ejemplo `tecnm-vinculacion`, y rama de producción `main`.
5. Framework preset: **None**. Build command: **dejar vacío**. Build output directory: **`.` (punto)** o `/` si la interfaz exige raíz del proyecto. Root directory: **raíz del repositorio**.
6. Pulsa **Save and Deploy** / **Deploy**. Cloudflare te mostrará la URL real `https://NOMBRE-ELEGIDO.pages.dev/`. No reutilices el proyecto antiguo.

Si Cloudflare ofrece opciones distintas para Build output directory, comprueba que se sirva el `index.html` del nivel raíz y se publique la carpeta `functions` como Pages Functions.

## 3) Configurar tres secretos (solo en el proyecto NUEVO)

Cloudflare → Workers & Pages → `tecnm-vinculacion` → **Settings → Variables and Secrets → Add**, entorno **Production**.

- `ADMIN_PASSWORD`: inventa contraseña nueva de 12 caracteres o más. Usuario fijo: `vinculacion`. No subas la contraseña a GitHub ni me la compartas.
- `ADMIN_SESSION_SECRET`: cadena aleatoria de 32 caracteres o más. Ejemplo para generarla localmente en PowerShell: `[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(48))`.
- `N8N_WEBHOOK_KEY`: una clave nueva o la que ya usa el **Header Auth de WF-05**, nunca una contraseña de un estudiante. Debe coincidir exactamente con el valor del encabezado `X-Automation-Key` configurado en n8n.

Selecciona tipo **Secret** para las tres. Guarda en **Production**, luego crea un **nuevo despliegue** con un commit en GitHub (por ejemplo, actualizar README.md) y comprueba estado Success.

**Importante**: las variables se crean en el proyecto nuevo, NO en `tecnm-servicio-social`.

## 4) Conservar WF-05

**No crees otro workflow si ya tienes WF-05**. Abre en n8n `WF-05 | Panel y estadisticas de Vinculacion`:

1. Nodo `Entrada panel Vinculacion`: método GET, path `ss-vinculacion-panel`, Authentication `Header Auth`, responde mediante `Respond to Webhook`.
2. La credencial Header Auth se configura con Name `X-Automation-Key` y Value **exactamente igual** a `N8N_WEBHOOK_KEY` del proyecto nuevo.
3. Conecta los tres nodos de Google Sheets: `Leer estudiantes` (ESTUDIANTES), `Leer expedientes` (EXPEDIENTES), `Leer documentos` (DOCUMENTOS).
4. `Preparar panel` debe devolver `{ok:true, estudiantes:[...], expedientes:[...], documentos:[...]}`.
5. `Responder panel`: `First Incoming Item`.
6. Guarda y publica WF-05. URL de producción prevista: `https://servicio-social.app.n8n.cloud/webhook/ss-vinculacion-panel`.

Si tu clave n8n actual coincide con otro workflow, no la cambies sin revisar los consumidores. Puedes reutilizar la existente en el proyecto nuevo; así evitas romper otros workflows.

## 5) Comprobar el acceso, datos y PDF

1. Abre la dirección real del nuevo sitio `.pages.dev/`.
2. En el login usa `vinculacion` y la contraseña de `ADMIN_PASSWORD`.
3. Verifica que aparezca Panel general, Expedientes y Reportes.
4. Tras iniciar sesión, abre la ruta `https://TU-PROYECTO.pages.dev/api/vinculacion/session`. Debe devolver `{"ok":true,"usuario":"vinculacion"}`.
5. Abre `https://TU-PROYECTO.pages.dev/api/vinculacion/data`. Debe devolver `{"ok":true,"estudiantes":[...],"expedientes":[...],"documentos":[...]}`.
6. En Reportes selecciona convocatoria y pulsa **Descargar reporte PDF**. Se generará el archivo en el navegador, usando los datos obtenidos de WF-05.

### Diagnóstico rápido

- `{"ok":false,"usuario":null}` **en `/api/vinculacion/session`**: no hay sesión válida en ese navegador; es normal antes de iniciar sesión. NO es un error de n8n.
- Login muestra «aún no está configurado»: faltan `ADMIN_PASSWORD` o `ADMIN_SESSION_SECRET` en **Production** del nuevo proyecto, o falta un despliegue posterior.
- Login funciona, pero estadísticas muestra `Falta N8N_WEBHOOK_KEY`: crear ese secreto en **Production** y volver a desplegar.
- Estadísticas muestra HTTP 401/403 de WF-05: revisar Name `X-Automation-Key` y Value, iguales en los dos sistemas.
- No hay ejecuciones en WF-05: comprobar publicación y URL de producción.
- `502` con formato inesperado: revisar salida del nodo `Preparar panel`.

## Seguridad

Este es un prototipo académico con datos ficticios. No pongas contraseñas ni tokens en frontend o GitHub. Para utilizar expedientes reales se necesita acceso institucional con MFA y controles de seguridad/auditoría adicionales. Mantén protegido el repositorio y restringe el acceso a los datos.
