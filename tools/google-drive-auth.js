const { google } = require("googleapis");
const readline = require("readline");
const fs = require("fs");
const path = require("path");

console.log("=== Google Drive API - Configuración de Autenticación ===\n");

// Buscar archivo de credenciales
const credentialsPath = path.join(__dirname, "..", "google-credentials.json");

if (!fs.existsSync(credentialsPath)) {
  console.error("❌ ERROR: No se encontró el archivo google-credentials.json");
  console.log("\n📋 Pasos para obtenerlo:");
  console.log("1. Ve a: https://console.cloud.google.com/");
  console.log("2. Crea un proyecto nuevo");
  console.log("3. Habilita Google Drive API");
  console.log("4. Crea credenciales OAuth 2.0 (Desktop app)");
  console.log("5. Descarga el JSON y guárdalo como google-credentials.json");
  console.log("6. Colócalo en la raíz del proyecto (junto a backend/)");
  process.exit(1);
}

const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
const { client_id, client_secret, redirect_uris } =
  credentials.installed || credentials.web;

const oauth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris ? redirect_uris[0] : "http://localhost",
);

const scopes = ["https://www.googleapis.com/auth/drive.file"];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: scopes,
  prompt: "consent",
});

console.log("✅ Credenciales cargadas correctamente\n");
console.log("📌 PASO 1: Abre esta URL en tu navegador:\n");
console.log(authUrl);
console.log("\n📌 PASO 2: Autoriza la aplicación");
console.log("📌 PASO 3: Copia el código que aparece\n");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Pega el código aquí: ", (code) => {
  rl.close();

  oauth2Client.getToken(code, (err, token) => {
    if (err) {
      console.error("❌ Error obteniendo el token:", err);
      return;
    }

    console.log("\n✅ ¡Autenticación exitosa!\n");
    console.log("📋 Agrega estas líneas a tu archivo .env:\n");
    console.log(`GOOGLE_DRIVE_CLIENT_ID="${client_id}"`);
    console.log(`GOOGLE_DRIVE_CLIENT_SECRET="${client_secret}"`);
    console.log(`GOOGLE_DRIVE_REFRESH_TOKEN="${token.refresh_token}"`);
    console.log("\n💡 Ahora crea una carpeta en Google Drive y obtén su ID");
    console.log(
      "   URL: https://drive.google.com/drive/folders/ID_DE_LA_CARPETA",
    );
    console.log('   Agrega: GOOGLE_DRIVE_FOLDER_ID="ID_DE_LA_CARPETA"');
  });
});
