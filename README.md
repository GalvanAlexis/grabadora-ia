# Grabadora IA

Sistema de grabación y transcripción con inteligencia artificial.

## 🎯 Características

- **Transcripción con IA**: Deepgram con speaker diarization
- **Análisis inteligente**: Groq (Llama 3.3 70B)
- **Almacenamiento**: Dropbox
- **Base de datos**: SQLite con Prisma
- **Backend**: NestJS + TypeScript
- **Mobile**: React Native + Expo (próximamente)

## 🚀 Tecnologías

### Backend

- NestJS
- Prisma 6
- SQLite
- TypeScript

### APIs

- Deepgram (transcripción)
- Groq (análisis)
- Dropbox (almacenamiento)

## 📦 Instalación

### Backend

```bash
cd backend
npm install
npx prisma generate
npm run start:dev
```

### Configuración

Crea un archivo `.env` en `backend/` basado en `.env.example`:

```env
DATABASE_URL="file:./prisma/dev.db"
DEEPGRAM_API_KEY="tu-key-aqui"
GROK_API_KEY="tu-key-aqui"
DROPBOX_ACCESS_TOKEN="tu-token-aqui"
```

## 📡 Endpoints

- `POST /audio/upload` - Sube audio a Dropbox
- `GET /audio/:id` - Obtiene información del audio
- `POST /transcription/:audioId` - Transcribe con Deepgram
- `GET /transcription/:audioId` - Obtiene transcripción

## 📝 Licencia

MIT
