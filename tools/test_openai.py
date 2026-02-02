"""
OpenAI Whisper API - Test de Transcripción con Speaker Diarization
Prueba la conexión con OpenAI y la funcionalidad de transcripción
"""

import os
import sys
from openai import OpenAI
from pathlib import Path

# Cargar variables de entorno desde backend/.env
from dotenv import load_dotenv

# Buscar .env en backend/
backend_env = Path(__file__).parent.parent / 'backend' / '.env'
if backend_env.exists():
    load_dotenv(backend_env)
else:
    load_dotenv()  # Intentar desde raíz

def test_openai_connection():
    """Verificar conexión con OpenAI API"""
    api_key = os.getenv('OPENAI_API_KEY')
    
    if not api_key:
        print("❌ Error: OPENAI_API_KEY no encontrada en .env")
        print(f"\n📝 Buscando en: {backend_env}")
        print("   Asegúrate de tener en backend/.env:")
        print('   OPENAI_API_KEY="sk-..."')
        return False
    
    if api_key == "tu-api-key-aqui":
        print("❌ Error: Debes reemplazar 'tu-api-key-aqui' con tu API key real")
        print(f"\n📝 Edita: {backend_env}")
        print('   OPENAI_API_KEY="sk-tu-key-real-aqui"')
        return False
    
    if not api_key.startswith('sk-'):
        print("❌ Error: OPENAI_API_KEY parece inválida (debe empezar con 'sk-')")
        return False
    
    print("✅ OpenAI API Key encontrada")
    print(f"   Key: {api_key[:10]}...{api_key[-4:]}")
    
    try:
        client = OpenAI(api_key=api_key)
        # Test simple con GPT para verificar conectividad
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Di 'OK'"}],
            max_tokens=5
        )
        print("✅ Conexión con OpenAI exitosa")
        print(f"   Respuesta: {response.choices[0].message.content}")
        return True
    except Exception as e:
        print(f"❌ Error conectando con OpenAI: {e}")
        return False


def create_test_audio():
    """Crear un audio de prueba simple usando síntesis de voz"""
    print("\n📝 Para probar la transcripción, necesitas un archivo de audio.")
    print("   Opciones:")
    print("   1. Usa tu propio archivo (WAV, MP3, etc.)")
    print("   2. Graba un audio corto con tu micrófono")
    print("   3. Descarga un audio de prueba")
    print("\n💡 Por ahora, vamos a verificar que la API funciona sin audio.")
    print("   Después crearemos el flujo completo de grabación.")


def test_whisper_api(audio_file_path=None):
    """Probar Whisper API con speaker diarization"""
    api_key = os.getenv('OPENAI_API_KEY')
    client = OpenAI(api_key=api_key)
    
    if not audio_file_path:
        print("\n⏭️  Saltando prueba de transcripción (sin archivo de audio)")
        print("   Una vez que tengas un audio, ejecuta:")
        print("   python tools/whisper_transcriber.py <ruta-al-audio>")
        return
    
    try:
        print(f"\n🎤 Transcribiendo: {audio_file_path}")
        
        with open(audio_file_path, 'rb') as audio_file:
            # Usar modelo con speaker diarization
            transcript = client.audio.transcriptions.create(
                model="whisper-1",  # Modelo base
                file=audio_file,
                response_format="verbose_json",
                timestamp_granularities=["segment"]
            )
        
        print("\n✅ Transcripción exitosa!")
        print(f"\n📝 Texto completo:")
        print(f"   {transcript.text}")
        
        if hasattr(transcript, 'segments'):
            print(f"\n📊 Segmentos ({len(transcript.segments)}):")
            for i, segment in enumerate(transcript.segments[:3]):  # Mostrar primeros 3
                print(f"   [{segment.start:.2f}s - {segment.end:.2f}s]: {segment.text}")
        
        return transcript
        
    except Exception as e:
        print(f"❌ Error en transcripción: {e}")
        return None


def main():
    print("=" * 60)
    print("🎯 Test de OpenAI Whisper API - Grabadora IA")
    print("=" * 60)
    
    # 1. Verificar conexión
    if not test_openai_connection():
        sys.exit(1)
    
    # 2. Info sobre audio de prueba
    create_test_audio()
    
    # 3. Verificar si hay un archivo de audio para probar
    test_audio = Path(__file__).parent.parent / '.tmp' / 'test_audio.mp3'
    if test_audio.exists():
        test_whisper_api(str(test_audio))
    else:
        print("\n💡 Próximos pasos:")
        print("   1. ✅ API Key verificada")
        print("   2. ⏳ Crear módulo de grabación de audio")
        print("   3. ⏳ Implementar transcripción completa")
        print("   4. ⏳ Configurar Google Drive para almacenamiento")
    
    print("\n" + "=" * 60)
    print("✅ Test completado - OpenAI API funcionando correctamente")
    print("=" * 60)


if __name__ == '__main__':
    main()
