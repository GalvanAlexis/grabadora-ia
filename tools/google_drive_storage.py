"""
Google Drive Storage Handler
Handles file upload/download operations with Google Drive API
"""

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload, MediaIoBaseDownload
import os
import io


class GoogleDriveStorage:
    def __init__(self, client_id, client_secret, refresh_token, folder_id):
        """Initialize Google Drive client"""
        self.folder_id = folder_id
        
        # Create credentials
        creds = Credentials(
            None,
            refresh_token=refresh_token,
            token_uri='https://oauth2.googleapis.com/token',
            client_id=client_id,
            client_secret=client_secret
        )
        
        # Build service
        self.service = build('drive', 'v3', credentials=creds)
    
    def upload_file(self, file_path, file_name=None):
        """
        Upload file to Google Drive
        Returns: file_id and shareable_link
        """
        if not file_name:
            file_name = os.path.basename(file_path)
        
        file_metadata = {
            'name': file_name,
            'parents': [self.folder_id]
        }
        
        media = MediaFileUpload(file_path, resumable=True)
        
        file = self.service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id, webViewLink, webContentLink'
        ).execute()
        
        # Make file publicly accessible
        self.service.permissions().create(
            fileId=file['id'],
            body={'type': 'anyone', 'role': 'reader'}
        ).execute()
        
        return {
            'file_id': file['id'],
            'view_link': file.get('webViewLink'),
            'download_link': file.get('webContentLink')
        }
    
    def download_file(self, file_id, destination_path):
        """Download file from Google Drive"""
        request = self.service.files().get_media(fileId=file_id)
        
        with io.FileIO(destination_path, 'wb') as fh:
            downloader = MediaIoBaseDownload(fh, request)
            done = False
            while not done:
                status, done = downloader.next_chunk()
        
        return destination_path
    
    def delete_file(self, file_id):
        """Delete file from Google Drive"""
        self.service.files().delete(fileId=file_id).execute()
        return True
    
    def list_files(self, max_results=10):
        """List files in the folder"""
        results = self.service.files().list(
            q=f"'{self.folder_id}' in parents",
            pageSize=max_results,
            fields="files(id, name, mimeType, createdTime, size)"
        ).execute()
        
        return results.get('files', [])


# Test connection
if __name__ == '__main__':
    import sys
    
    # Load from environment
    from dotenv import load_dotenv
    load_dotenv()
    
    client_id = os.getenv('GOOGLE_DRIVE_CLIENT_ID')
    client_secret = os.getenv('GOOGLE_DRIVE_CLIENT_SECRET')
    refresh_token = os.getenv('GOOGLE_DRIVE_REFRESH_TOKEN')
    folder_id = os.getenv('GOOGLE_DRIVE_FOLDER_ID')
    
    if not all([client_id, client_secret, refresh_token, folder_id]):
        print("❌ Error: Faltan credenciales de Google Drive en .env")
        sys.exit(1)
    
    try:
        storage = GoogleDriveStorage(client_id, client_secret, refresh_token, folder_id)
        files = storage.list_files(5)
        
        print("✅ Conexión exitosa con Google Drive!")
        print(f"📁 Archivos en la carpeta ({len(files)}):")
        for f in files:
            print(f"  - {f['name']} ({f.get('size', 'N/A')} bytes)")
    except Exception as e:
        print(f"❌ Error conectando con Google Drive: {e}")
        sys.exit(1)
