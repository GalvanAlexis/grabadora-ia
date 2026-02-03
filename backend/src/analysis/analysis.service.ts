import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import OpenAI from 'openai';

@Injectable()
export class AnalysisService {
  private groq: OpenAI;

  constructor(private prisma: PrismaService) {
    // Initialize Groq client (uses OpenAI SDK with custom base URL)
    this.groq = new OpenAI({
      apiKey: process.env.GROK_API_KEY || process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    });
  }

  async analyzeTranscription(audioId: string) {
    // 1. Get transcription from database
    const transcription = await this.prisma.transcription.findUnique({
      where: { audioId },
      include: { audio: true },
    });

    if (!transcription) {
      throw new Error('Transcription not found');
    }

    const fullText = transcription.fullText;

    // 2. Generate summary
    const summaryPrompt = `Analiza la siguiente transcripción y genera un resumen conciso y claro en español:

Transcripción:
${fullText}

Resumen:`;

    const summaryResponse = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content:
            'Eres un asistente experto en resumir conversaciones y reuniones. Genera resúmenes concisos, claros y en español.',
        },
        {
          role: 'user',
          content: summaryPrompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const summary =
      summaryResponse.choices[0].message.content ||
      'No se pudo generar resumen';

    // 3. Extract tasks/action items
    const tasksPrompt = `Analiza la siguiente transcripción y extrae todas las tareas, acciones pendientes o compromisos mencionados. Devuelve SOLO un array JSON con objetos que tengan las propiedades: "task" (descripción de la tarea) y "assignee" (persona asignada, o "No especificado" si no se menciona).

Transcripción:
${fullText}

Responde SOLO con el array JSON, sin texto adicional:`;

    const tasksResponse = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content:
            'Eres un asistente que extrae tareas y acciones de conversaciones. Responde SOLO con JSON válido.',
        },
        {
          role: 'user',
          content: tasksPrompt,
        },
      ],
      temperature: 0.2,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    let tasks = [];
    try {
      const tasksContent = tasksResponse.choices[0].message.content || '{}';
      const tasksJson = this.extractJson(tasksContent);
      tasks = tasksJson.tasks || tasksJson.items || [];
    } catch (e) {
      console.error('Error parsing tasks JSON:', e);
      tasks = [];
    }

    // 4. Generate hierarchical schema
    const schemaPrompt = `Analiza la siguiente transcripción y genera un esquema jerárquico de los temas principales y subtemas discutidos. Devuelve SOLO un array JSON con objetos que tengan: "topic" (tema principal), "subtopics" (array de subtemas), y "timestamp" (momento aproximado en la conversación, ej: "inicio", "medio", "final").

Transcripción:
${fullText}

Responde SOLO con el array JSON, sin texto adicional:`;

    const schemaResponse = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content:
            'Eres un asistente que organiza información en esquemas jerárquicos. Responde SOLO con JSON válido.',
        },
        {
          role: 'user',
          content: schemaPrompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    });

    let schema = [];
    try {
      const schemaContent = schemaResponse.choices[0].message.content || '{}';
      const schemaJson = this.extractJson(schemaContent);
      schema = schemaJson.topics || schemaJson.schema || [];
    } catch (e) {
      console.error('Error parsing schema JSON:', e);
      schema = [];
    }

    // 5. Save analysis to database
    const analysis = await this.prisma.analysis.create({
      data: {
        audioId,
        summary: summary,
        tasks: tasks,
        hierarchicalSchema: schema,
      } as any,
    });

    return analysis;
  }

  async getAnalysis(audioId: string) {
    return this.prisma.analysis.findUnique({
      where: { audioId },
      include: {
        audio: {
          include: {
            transcription: true,
          },
        },
      },
    });
  }

  private extractJson(content: string): any {
    try {
      // 1. Try direct parse
      return JSON.parse(content);
    } catch (e) {
      // 2. Try extracting from markdown code blocks
      const jsonMatch =
        content.match(/```json\n([\s\S]*?)\n```/) ||
        content.match(/```\n([\s\S]*?)\n```/);

      if (jsonMatch && jsonMatch[1]) {
        try {
          return JSON.parse(jsonMatch[1]);
        } catch (e2) {
          console.warn('Failed to parse JSON from code block:', e2);
        }
      }

      // 3. Try finding the first '{' and last '}'
      const firstBrace = content.indexOf('{');
      const lastBrace = content.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        try {
          return JSON.parse(content.substring(firstBrace, lastBrace + 1));
        } catch (e3) {
          console.warn('Failed to parse JSON from braces:', e3);
        }
      }

      // Return empty object/array based on context if needed, or throw
      // For this app, returning null/empty allows partial success
      return {};
    }
  }
}
