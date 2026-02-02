"""
AI Provider Test (Groq vs Grok)
Detecta si la key es de Groq o Grok y prueba la conexión adecuada.
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
    # Intentar leer GROK_API_KEY (donde el usuario pegó la key)
    key = os.getenv('GROK_API_KEY')
    if key and key != "xai-tu-key-aqui":
        return key, "GROK_API_KEY"
    
    # Intentar leer OPENAI_API_KEY (por si acaso)
    key = os.getenv('OPENAI_API_KEY')
    if key and key.startswith('gsk_'):
        return key, "OPENAI_API_KEY"
        
    return None, None

def test_provider():
    api_key, env_var_name = get_api_key()
    
    if not api_key:
        print("❌ Error: No se encontró ninguna API Key válida en .env")
        return False

    print(f"🔑 Key detectada en {env_var_name}: {api_key[:8]}...")

    # Detección de Proveedor
    if api_key.startswith('gsk_'):
        print("\n🕵️  Detección: La key empieza con 'gsk_', parece ser de **GROQ** (Cloud Interface).")
        base_url = "https://api.groq.com/openai/v1"
        model = "llama3-8b-8192"  # Modelo rápido de Groq
        provider_name = "Groq"
    elif api_key.startswith('xai-'):
        print("\n🕵️  Detección: La key empieza con 'xai-', es de **Grok** (xAI).")
        base_url = "https://api.x.ai/v1"
        model = "grok-beta"
        provider_name = "Grok"
    else:
        print("\n⚠️  No se reconoce el prefijo. Intentando como Grok (xAI) por defecto...")
        base_url = "https://api.x.ai/v1"
        model = "grok-beta"
        provider_name = "Grok (xAI)"

    try:
        client = OpenAI(
            api_key=api_key,
            base_url=base_url,
        )
        
        print(f"🚀 Probando conexión con {provider_name}...")
        completion = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "user", "content": "Responde solo con: CONEXIÓN_EXITOSA"}
            ]
        )
        
        print(f"✅ Respuesta recibida: {completion.choices[0].message.content}")
        
        # Guardar en archivo para que el usuario sepa
        if provider_name == "Groq":
            print("\n💡 NOTA: Estás usando Groq. Es EXCELENTE para análisis (muy rápido).")
            print("   Actualizaremos la configuración para usar 'llama3-70b-8192'.")
            
        return True
        
    except Exception as e:
        print(f"❌ Error conectando con {provider_name}: {e}")
        return False

if __name__ == '__main__':
    test_provider()
