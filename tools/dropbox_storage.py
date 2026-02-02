"""
Dropbox Storage Handler
Handles file upload/download operations with Dropbox API
"""

import dropbox
import os
import sys

class DropboxStorage:
    def __init__(self, access_token):
        """Initialize Dropbox client"""
        try:
            self.dbx = dropbox.Dropbox(access_token)
            # Verificar conexión
            self.dbx.users_get_current_account()
        except Exception as e:
            raise Exception(f"Error conectando con Dropbox: {e}")
    
    def upload_file(self, file_path, custom_name=None):
        """
        Upload file to Dropbox
        Returns: shared_link
        """
        if not custom_name:
            custom_name = os.path.basename(file_path)
        
        # Dropbox usa rutas absolutas tipo /archivo.mp3
        dest_path = f"/{custom_name}"
        
        with open(file_path, "rb") as f:
            self.dbx.files_upload(
                f.read(), 
                dest_path, 
                mode=dropbox.files.WriteMode("overwrite")
            )
            
        # Crear link compartido
        try:
            shared_link_metadata = self.dbx.sharing_create_shared_link_with_settings(dest_path)
            return shared_link_metadata.url
        except dropbox.exceptions.ApiError as e:
            if e.error.is_shared_link_already_exists():
                links = self.dbx.sharing_get_shared_links(dest_path)
                return links.links[0].url
            raise e

    def list_files(self):
        """List files in the app folder"""
        result = self.dbx.files_list_folder('')
        return [entry.name for entry in result.entries]


# Test connection
if __name__ == '__main__':
    from dotenv import load_dotenv
    # Cargar .env desde backend/
    backend_env = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend', '.env')
    load_dotenv(backend_env)
    
    token = os.getenv('DROPBOX_ACCESS_TOKEN')
    
    if not token or token.startswith("pegue-su"):
        print("❌ Error: Falta configurar DROPBOX_ACCESS_TOKEN en backend/.env")
        sys.exit(1)
    
    try:
        storage = DropboxStorage(token)
        print("✅ Conexión exitosa con Dropbox!")
        print(f"📁 Archivos: {storage.list_files()}")
    except Exception as e:
        print(f"❌ Error: {e}")
