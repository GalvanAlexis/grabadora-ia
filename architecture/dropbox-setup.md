# Dropbox Storage Setup Guide

## Objetivo

Configurar Dropbox para almacenar archivos de audio y exports.
Límite gratuito: **2 GB**.

## Pasos Rápidos (2 minutos)

1. Ve a: [Dropbox App Console](https://www.dropbox.com/developers/apps)
2. Clic en **"Create app"**
3. Configuración:
   - Choose an API: **Scoped Access**
   - Type of access: **App folder** (Recomendado: crea una carpeta segura solo para la app)
   - Name your app: **Grabadora_IA_Dev_TuNombre** (El nombre debe ser único globalmente)
   - Clic en **"Create app"**

4. En la pestaña **"Permissions"**:
   - Marca: `files.content.write` y `files.content.read`
   - Clic en **"Submit"** (abajo del todo)

5. En la pestaña **"Settings"**:
   - Busca la sección **"OAuth 2"**
   - Busca el botón **"Generate"** bajo "Generated access token"
   - **Copia ese token larguísimo**

## Configuración en tu PC

6. Abre `backend/.env`
7. Agrega/Modifica:

```env
DROPBOX_ACCESS_TOKEN="tu-token-aqui"
```

## Ventaja

A diferencia de Google Drive, no requerimos flujos OAuth complejos para desarrollo. Con este token tienes acceso directo inmediato.
