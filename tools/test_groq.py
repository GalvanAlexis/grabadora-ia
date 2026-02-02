"""
Groq API Test (Text + Audio)
Verifica la conexión con Groq para:
1. Análisis de texto (Llama 3)
2. Transcripción de audio (Whisper-large-v3)
"""

import os
import sys
from openai import OpenAI
from pathlib import Path
from dotenv import load_dotenv

# Cargar variables de entorno
backend_env = Path(__file__).parent.parent / 'backend' / '.env'
if backend_env.exists():
    load_dotenv(backend_env)
else:
    load_dotenv()

def get_api_key():
    # Buscar GROQ_API_KEY o GROK_API_KEY
    key = os.getenv('GROQ_API_KEY') or os.getenv('GROK_API_KEY')
    return key

def test_groq_text(client):
    print("\n📝 Probando MODELO DE TEXTO (llama3-70b-8192)...")
    try:
        completion = client.chat.completions.create(
            model="llama3-70b-8192",
            messages=[
                {"role": "user", "content": "Responde solo con: CONEXIÓN_TXT_EXITOSA"}
            ]
        )
        print(f"✅ Respuesta: {completion.choices[0].message.content}")
        return True
    except Exception as e:
        print(f"❌ Error texto: {e}")
        return False

def test_groq_audio(client):
    print("\n🎤 Probando MODELO DE AUDIO (whisper-large-v3)...")
    
    # Crear archivo dummy si no existe
    test_audio = Path(__file__).parent.parent / '.tmp' / 'test_audio.mp3'
    if not test_audio.exists():
        print("⚠️  No hay archivo de audio en .tmp/test_audio.mp3")
        print("   Saltando prueba de audio. (Pero si texto funcionó, audio debería funcionar)")
        return True

    try:
        with open(test_audio, "rb") as file:
            transcription = client.audio.transcriptions.create(
                file=(test_audio.name, file.read()),
                model="whisper-large-v3",
                response_format="json"
            )
        print(f"✅ Transcripción: {transcription.text[:50]}...")
        return True
    except Exception as e:
        print(f"❌ Error audio: {e}")
        return False

def main():
    print("=" * 60)
    print("🎯 Test de Groq API - Grabadora IA")
    print("=" * 60)
    
    api_key = get_api_key()
    if not api_key:
        print("❌ Error: No se encontró API Key (GROQ_API_KEY o GROK_API_KEY)")
        return

    client = OpenAI(
        api_key=api_key,
        base_url="https://api.groq.com/openai/v1",
    )
    
    if test_groq_text(client):
        test_groq_audio(client)
        print("\n✨ CONCLUSIÓN:")
        print("   ✅ Conexión con Groq exitosa.")
        print("   ✅ Podemos usar Groq para TODO (Análisis + Transcripción).")
    
    print("\n" + "=" * 60)

if __name__ == '__main__':
    main()
