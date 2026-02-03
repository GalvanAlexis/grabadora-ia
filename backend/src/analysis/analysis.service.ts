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

    // Chunk size: ~20,000 chars to stay safe within Groq's 12k TPM (~48k chars)
    const CHUNK_SIZE = 20000;
    const chunks: string[] = [];
    for (let i = 0; i < fullText.length; i += CHUNK_SIZE) {
      chunks.push(fullText.substring(i, i + CHUNK_SIZE));
    }

    console.log(
      `[AnalysisService] Processing ${chunks.length} chunks for audioId: ${audioId}`,
    );

    // --- 1. GENERATE SUMMARY (Map-Reduce) ---
    let partialSummaries: string[] = [];
    for (const [index, chunk] of chunks.entries()) {
      console.log(
        `[AnalysisService] Summarizing chunk ${index + 1}/${chunks.length}`,
      );
      const response = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content:
              'Eres un experto sintetizando información. Resume este fragmento de una transcripción.',
          },
          { role: 'user', content: chunk },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });
      const content = response.choices[0].message.content;
      if (content) partialSummaries.push(content);
    }

    let finalSummary = '';
    if (partialSummaries.length > 1) {
      console.log(
        `[AnalysisService] Generating final summary from ${partialSummaries.length} parts`,
      );
      const response = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content:
              'Une los siguientes resúmenes parciales en un único resumen cohesionado y claro en español.',
          },
          { role: 'user', content: partialSummaries.join('\n\n') },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });
      finalSummary =
        response.choices[0].message.content ||
        'No se pudo generar el resumen final';
    } else {
      finalSummary = partialSummaries[0] || 'No se pudo generar resumen';
    }

    // --- 2. EXTRACT TASKS (Concatenation) ---
    let allTasks: any[] = [];
    for (const [index, chunk] of chunks.entries()) {
      console.log(
        `[AnalysisService] Extracting tasks from chunk ${index + 1}/${chunks.length}`,
      );
      const response = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content:
              'Extrae tareas y compromisos. Responde SOLO con un JSON: {"tasks": [{"task": "desc", "assignee": "name"}]}',
          },
          { role: 'user', content: chunk },
        ],
        temperature: 0.1,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      });

      try {
        const content = response.choices[0].message.content || '{}';
        const json = this.extractJson(content);
        const chunkTasks = json.tasks || json.items || [];
        allTasks = [...allTasks, ...chunkTasks];
      } catch (e) {
        console.error(`Error parsing tasks in chunk ${index}:`, e);
      }
    }

    // --- 3. GENERATE SCHEMA (Concatenation) ---
    let fullSchema: any[] = [];
    for (const [index, chunk] of chunks.entries()) {
      console.log(
        `[AnalysisService] Generating schema for chunk ${index + 1}/${chunks.length}`,
      );
      const response = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content:
              'Genera un esquema jerárquico. Responde SOLO con un JSON: {"topics": [{"topic": "name", "subtopics": [], "timestamp": "..."}]}',
          },
          { role: 'user', content: chunk },
        ],
        temperature: 0.2,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      });

      try {
        const content = response.choices[0].message.content || '{}';
        const json = this.extractJson(content);
        const chunkTopics = json.topics || json.schema || [];
        fullSchema = [...fullSchema, ...chunkTopics];
      } catch (e) {
        console.error(`Error parsing schema in chunk ${index}:`, e);
      }
    }

    // 5. Save analysis to database
    // FIX: Field 'hierarchicalSchema' renamed to 'schema' as per prisma file
    const analysis = await this.prisma.analysis.create({
      data: {
        audioId,
        summary: finalSummary,
        tasks: allTasks,
        schema: fullSchema,
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
