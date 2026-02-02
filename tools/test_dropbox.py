"""
Dropbox Connection Test
Verifica que el token de Dropbox sea válido y tenga permisos de escritura.
"""

import os
import sys
import dropbox
from dotenv import load_dotenv
from pathlib import Path

# Cargar variables de entorno
backend_env = Path(__file__).parent.parent / 'backend' / '.env'
if backend_env.exists():
    load_dotenv(backend_env)
else:
    load_dotenv()

def test_dropbox():
    token = os.getenv('DROPBOX_ACCESS_TOKEN')
    
    if not token:
        print("❌ Error: DROPBOX_ACCESS_TOKEN no encontrado en .env")
        return False

    print(f"🔑 Token encontrado: {token[:10]}...")

    try:
        dbx = dropbox.Dropbox(token)
        account = dbx.users_get_current_account()
        print(f"✅ Conexión exitosa!")
        print(f"👤 Usuario: {account.name.display_name}")
        print(f"📧 Email: {account.email}")
        
        # Prueba de escritura
        try:
            print("📝 Probando subida de archivo...")
            dbx.files_upload(b"Test file content", "/conection_test.txt", mode=dropbox.files.WriteMode("overwrite"))
            print("✅ Escritura exitosa (/conection_test.txt)")
        except Exception as e:
            print(f"⚠️  Conexión bien, pero falla escritura: {e}")
            print("   (Verifica que la App tenga permiso 'files.content.write')")
        
        return True

    except Exception as e:
        print(f"❌ Error conectando con Dropbox: {e}")
        return False

if __name__ == '__main__':
    print("=" * 60)
    print("📦 Test de Dropbox API")
    print("=" * 60)
    test_dropbox()
    print("=" * 60)
