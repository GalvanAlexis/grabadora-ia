# 🚀 Grabadora IA - Resumen de Migración

Este documento sirve como base de conocimiento para continuar el desarrollo del proyecto **Grabadora IA** en un nuevo chat.

## 📝 Resumen del Proyecto

Aplicación móvil (React Native + Expo) y backend (NestJS) para grabar/subir audios, transcribirlos con **Deepgram**, analizarlos con **Groq** y exportarlos en múltiples formatos. El almacenamiento y exportación se gestionan en **Dropbox**.

---

## 🛠️ Stack Tecnológico

- **Backend**: NestJS, Prisma ORM, SQLite.
- **Mobile**: React Native, Expo SDK 54, Zustand, React Query, Axios.
- **API Externas**:
  - **Deepgram**: Transcripción con diarización de hablantes.
  - **Groq (Llama 3.3 70b)**: Análisis y resumen.
  - **Dropbox**: Almacenamiento y gestión de archivos.

---

## 🌐 Configuración del Entorno (Crucial)

### Red y Conectividad

- **IP Local PC**: `192.168.1.100` (Usada para conectar el móvil físico al backend).
- **Backend URL**: `http://192.168.1.100:3000`
- **Expo URL**: `exp://192.168.1.100:8081`

### Credenciales (.env)

- **Deepgram API**: Configurada y funcional.
- **Groq API**: Configurada y funcional.
- **Dropbox Token**: Actualizado recientemente con permisos completos (`files.content.write`, `sharing.write`). Verificado con script manual.

---

## ✅ Logros Recientes

1. **MVP Mobile Finalizado**: Pantallas de Welcome y Dashboard funcionales.
2. **Soporte para Archivos Grandes**:
   - NestJS configurado con límite de **200MB**.
   - Multer configurado con límite de **200MB**.
   - Axios Timeout aumentado a **5 minutos** para subidas.
3. **Correcciones de Errores**:
   - Eliminada la propiedad CSS `gap` que causaba el error `String cannot be cast to Boolean` en Android físico.
   - Downgrade de Prisma a versión **6** por problemas de inicialización en la v7.
   - Configuración de Expo para usar puertos específicos y evitar conflictos.

---

## ❌ Bloqueadores Actuales (Atención aquí)

- **Error HTTP 500 en Upload**: A pesar de que el token de Dropbox fue verificado con un script manual (`node test-dropbox-token.js`) y pasó todos los tests, el backend sigue arrojando un error 500 al intentar subir archivos reales (como el M4A de 80MB) desde la app.
  - **Hipótesis**: Podría ser un error de permisos de escritura en la carpeta `/uploads` local en Windows, un error no capturado en la transacción de Prisma, o un problema de concurrencia de SQLite.

---

## 📋 Próximos Pasos (Para el nuevo chat)

1. **Debuguear el Error 500**:
   - Abrir `audio.service.ts` y añadir logs detallados (try/catch con console.error completo).
   - Verificar que la carpeta `backend/uploads` existe y tiene permisos.
2. **Funcionalidad de Grabación**:
   - Implementar `expo-av` para grabar directamente desde el móvil.
3. **Diarización y Formateo**:
   - Pulir la visualización de los hablantes en el Dashboard.
4. **Refinamiento UI/UX**:
   - Añadir animaciones "premium" y mejorar la estética del Dashboard.

---

## 📂 Archivos Clave

- `backend/src/audio/audio.service.ts`: Lógica de subida y Dropbox.
- `mobile/screens/WelcomeScreen.tsx`: Lógica de selección de archivos.
- `mobile/constants/config.ts`: Configuración de la IP y API_URL.
- `.env`: Todas las API Keys y secretos.

---

**Instrucción para la nueva IA:** "Lee este resumen y el archivo `task.md` para entender el progreso. El objetivo inmediato es solucionar el error 500 en la subida de archivos real desde el móvil."
