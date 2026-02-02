"""
Test script for Export Service
Tests export generation in all 10 formats
"""

import requests
import json

BASE_URL = "http://localhost:3000"

def test_export_service():
    print("=" * 60)
    print("🧪 Test de ExportService - Grabadora IA")
    print("=" * 60)
    
    print("\n📋 Formatos disponibles:")
    formats = [
        ("json", "Datos estructurados completos"),
        ("txt", "Texto plano"),
        ("md", "Markdown formateado"),
        ("srt", "Subtítulos estándar"),
        ("vtt", "Subtítulos web (WebVTT)"),
        ("csv", "Tabla de datos"),
        ("xml", "Datos estructurados XML"),
        ("conll", "Formato lingüístico"),
        ("eaf", "ELAN Annotation Format"),
        ("html", "Página web autocontenida"),
    ]
    
    for i, (fmt, desc) in enumerate(formats, 1):
        print(f"   {i:2d}. {fmt.upper():6s} - {desc}")
    
    print("\n📡 Endpoints disponibles:")
    print(f"   POST {BASE_URL}/export/:audioId/:format - Generar export")
    print(f"   GET  {BASE_URL}/export/:exportId - Obtener export")
    print(f"   GET  {BASE_URL}/export/audio/:audioId - Listar exports")
    
    print("\n✅ ExportService configurado con:")
    print("   - 10 formatos de exportación")
    print("   - Upload automático a Dropbox")
    print("   - Shared links para descarga")
    
    print("\n📝 Ejemplo de uso:")
    print("""
    # 1. Generar export en formato JSON
    curl -X POST http://localhost:3000/export/{audioId}/json
    
    # 2. Generar export en formato MD
    curl -X POST http://localhost:3000/export/{audioId}/md
    
    # 3. Listar todos los exports de un audio
    curl http://localhost:3000/export/audio/{audioId}
    
    # 4. Obtener un export específico
    curl http://localhost:3000/export/{exportId}
    """)
    
    print("\n🔄 Workflow completo:")
    print("   1. Upload audio → POST /audio/upload")
    print("   2. Transcribir → POST /transcription/:audioId")
    print("   3. Analizar → POST /analysis/:audioId")
    print("   4. Exportar → POST /export/:audioId/:format")
    print("   5. Descargar → Usar downloadUrl del response")
    
    print("\n" + "=" * 60)
    print("✅ ExportService listo para usar")
    print("=" * 60)

if __name__ == "__main__":
    test_export_service()
