# Google Drive API Setup Guide

## Objetivo

Configurar Google Drive API para almacenar archivos de audio y exports de forma gratuita (15GB incluidos).

## Pasos para Obtener Credenciales

### 1. Crear Proyecto en Google Cloud Console

1. Ve a: https://console.cloud.google.com/
2. Clic en "Select a project" → "New Project"
3. Nombre: "Grabadora IA"
4. Clic en "Create"

### 2. Habilitar Google Drive API

1. En el menú lateral: "APIs & Services" → "Library"
2. Busca: "Google Drive API"
3. Clic en "Enable"

### 3. Crear Credenciales OAuth 2.0

1. "APIs & Services" → "Credentials"
2. Clic en "+ CREATE CREDENTIALS" → "OAuth client ID"
3. Si pide configurar pantalla de consentimiento:
   - Clic en "CONFIGURE CONSENT SCREEN"
   - Selecciona "External"
   - Nombre de la app: "Grabadora IA"
   - Email de soporte: tu email
   - Guarda y continúa
4. Vuelve a "Credentials" → "Create OAuth client ID"
5. Application type: "Desktop app"
6. Name: "Grabadora IA Backend"
7. Clic en "Create"
8. **Descarga el JSON** (guárdalo como `google-credentials.json`)

### 4. Obtener Refresh Token

Ejecuta este script Node.js (lo crearemos en tools/):

```javascript
// tools/google-drive-auth.js
const { google } = require("googleapis");
const readline = require("readline");

const credentials = require("../google-credentials.json");
const { client_id, client_secret } = credentials.installed;

const oauth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  "http://localhost",
);

const scopes = ["https://www.googleapis.com/auth/drive.file"];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: scopes,
});

console.log("Authorize this app by visiting this url:", authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Enter the code from that page here: ", (code) => {
  rl.close();
  oauth2Client.getToken(code, (err, token) => {
    if (err) return console.error("Error retrieving access token", err);
    console.log("Your refresh token is:", token.refresh_token);
  });
});
```

Ejecuta:

```bash
node tools/google-drive-auth.js
```

### 5. Crear Carpeta en Google Drive

1. Ve a https://drive.google.com
2. Crea una carpeta llamada "Grabadora_IA_Audios"
3. Clic derecho → "Get link" → "Anyone with the link can view"
4. Copia el ID de la carpeta de la URL:
   - URL: `https://drive.google.com/drive/folders/1ABC123XYZ`
   - ID: `1ABC123XYZ`

### 6. Configurar .env

Pega las credenciales en `backend/.env`:

```env
GOOGLE_DRIVE_CLIENT_ID="tu-client-id.apps.googleusercontent.com"
GOOGLE_DRIVE_CLIENT_SECRET="tu-client-secret"
GOOGLE_DRIVE_REFRESH_TOKEN="tu-refresh-token"
GOOGLE_DRIVE_FOLDER_ID="1ABC123XYZ"
```

## Ventajas de Google Drive

✅ **Gratis:** 15GB incluidos con cuenta Google  
✅ **Sin tarjeta:** No requiere tarjeta de crédito  
✅ **Fácil:** Interfaz familiar  
✅ **Compartir:** Links públicos para exports  
✅ **Backup:** Google maneja redundancia

## Límites

- **Cuota diaria:** 1 billón de queries/día (más que suficiente)
- **Tamaño de archivo:** 5TB por archivo
- **Almacenamiento:** 15GB gratis (expandible con Google One)

## Próximos Pasos

1. Sigue los pasos 1-6 arriba
2. Pega las credenciales en `.env`
3. Ejecutaremos un script de prueba para verificar conexión
