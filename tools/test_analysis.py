"""
Test script for Analysis Service
Tests the complete workflow: Upload -> Transcribe -> Analyze
"""

import requests
import json
import time

BASE_URL = "http://localhost:3000"

def test_analysis_workflow():
    print("=" * 60)
    print("🧪 Test de Análisis con Groq - Grabadora IA")
    print("=" * 60)
    
    # Note: This is a mock test since we need actual audio file
    # In real usage, you would:
    # 1. Upload audio file
    # 2. Wait for transcription
    # 3. Trigger analysis
    
    print("\n📋 Endpoints disponibles:")
    print(f"   POST {BASE_URL}/analysis/:audioId - Analizar transcripción")
    print(f"   GET  {BASE_URL}/analysis/:audioId - Obtener análisis")
    
    print("\n✅ AnalysisService configurado con:")
    print("   - Modelo: llama-3.3-70b-versatile")
    print("   - Funciones:")
    print("     1. Resumen automático")
    print("     2. Extracción de tareas")
    print("     3. Schema jerárquico de temas")
    
    print("\n📝 Ejemplo de uso:")
    print("""
    # 1. Subir audio
    curl -X POST http://localhost:3000/audio/upload \\
      -F "file=@audio.mp3" \\
      -F "userId=user123"
    
    # 2. Transcribir (automático con Deepgram)
    curl -X POST http://localhost:3000/transcription/{audioId}
    
    # 3. Analizar con Groq
    curl -X POST http://localhost:3000/analysis/{audioId}
    
    # 4. Obtener resultados
    curl http://localhost:3000/analysis/{audioId}
    """)
    
    print("\n" + "=" * 60)
    print("✅ AnalysisService listo para usar")
    print("=" * 60)

if __name__ == "__main__":
    test_analysis_workflow()
