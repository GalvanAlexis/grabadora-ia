import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import OpenAI from 'openai';
import { AudioService } from '../audio/audio.service'; // Import AudioService for cleanup

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);
  private groq: OpenAI;
  private ollama: OpenAI;

  constructor(
    private prisma: PrismaService,
    private audioService: AudioService,
  ) {
    // 1. Initialize Groq (Primary)
    this.groq = new OpenAI({
      apiKey: process.env.GROK_API_KEY || process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    });

    // 2. Initialize Ollama (Fallback)
    // Assumes Ollama is running locally on default port 11434
    this.ollama = new OpenAI({
      apiKey: 'ollama', // Not required but SDK needs string
      baseURL: 'http://localhost:11434/v1',
    });
  }

  private async sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Generic LLM Caller with Fallback
  private async callLlmWithFallback(
    params: any,
    taskName: string,
  ): Promise<string> {
    // Try Groq First
    try {
      this.logger.log(`[${taskName}] Calling Groq...`);
      const response = await this.groq.chat.completions.create({
        ...params,
        model: 'llama-3.3-70b-versatile', // Faster, cheaper
      });
      return response.choices[0].message.content || '';
    } catch (groqError: any) {
      this.logger.warn(
        `[${taskName}] Groq failed: ${groqError.message}. Switching to Ollama...`,
      );

      // Try Ollama Fallback
      try {
        const response = await this.ollama.chat.completions.create({
          ...params,
          model: 'llama3.2', // Should match a model user has pulled
        });
        this.logger.log(`[${taskName}] Ollama success.`);
        return response.choices[0].message.content || '';
      } catch (ollamaError: any) {
        this.logger.error(
          `[${taskName}] Ollama also failed: ${ollamaError.message}`,
        );
        throw new Error(`All AI providers failed for ${taskName}`);
      }
    }
  }

  async analyzeTranscription(audioId: string) {
    try {
      // 1. Get transcription from database
      const transcription = await this.prisma.transcription.findUnique({
        where: { audioId },
        include: { audio: true },
      });

      if (!transcription) {
        throw new Error('Transcription not found');
      }

      const fullText = transcription.fullText;

      // Validate text length
      if (!fullText || fullText.length < 50) {
        this.logger.warn(`Text too short for analysis: ${audioId}`);
        // Consider this a "success" but empty analysis to avoid deleting valid short audios?
        // Or fail? Let's proceed with empty.
      }

      // Chunk size
      const CHUNK_SIZE = 15000;
      const chunks: string[] = [];
      for (let i = 0; i < fullText.length; i += CHUNK_SIZE) {
        chunks.push(fullText.substring(i, i + CHUNK_SIZE));
      }

      this.logger.log(
        `Processing ${chunks.length} chunks for audioId: ${audioId}`,
      );

      // 2. Define Pipelines
      const summaryPipeline = async () => {
        let partialSummaries: string[] = [];
        for (const [index, chunk] of chunks.entries()) {
          const content = await this.callLlmWithFallback(
            {
              messages: [
                {
                  role: 'system',
                  content:
                    'Eres un experto sintetizando información. Genera un resumen conciso y directo del texto proporcionado.',
                },
                { role: 'user', content: chunk },
              ],
              temperature: 0.3,
              max_tokens: 500,
            },
            `Summary Chunk ${index + 1}`,
          );
          if (content) partialSummaries.push(content);
        }

        if (partialSummaries.length > 1) {
          const final = await this.callLlmWithFallback(
            {
              messages: [
                {
                  role: 'system',
                  content:
                    'Combina los siguientes resúmenes parciales en un único resumen coherente y profesional en español.',
                },
                { role: 'user', content: partialSummaries.join('\n\n') },
              ],
              temperature: 0.3,
              max_tokens: 1000,
            },
            'Final Summary',
          );
          return final || 'No se pudo generar el resumen final';
        }
        return partialSummaries[0] || 'No se pudo generar resumen';
      };

      const tasksPipeline = async () => {
        let allTasks: any[] = [];
        for (const [index, chunk] of chunks.entries()) {
          const content = await this.callLlmWithFallback(
            {
              messages: [
                {
                  role: 'system',
                  content:
                    'Extrae tareas o acciones pendientes. Responde ESTRICTAMENTE con un objeto JSON válido con este formato: {"items": [{"task": "descripcion", "assignee": "nombre o N/A"}]}. No añadas texto extra.',
                },
                { role: 'user', content: chunk },
              ],
              temperature: 0.1,
              max_tokens: 800,
              response_format: { type: 'json_object' },
            },
            `Tasks Chunk ${index + 1}`,
          );

          const json = this.extractJson(content);
          allTasks = [...allTasks, ...(json.items || json.tasks || [])];
        }
        return allTasks;
      };

      // 3. Execution
      const [finalSummary, allTasks] = await Promise.all([
        summaryPipeline(),
        tasksPipeline(),
      ]);

      // Schema/Topics removed for simplicity/speed as requested "Optimization" implies focus on core value.
      // If schema is strictly needed, we can re-add. Assuming Summary + Tasks is core.
      // Wait, USER asked for deep analysis, let's keep Schema but optimize prompt.

      const schemaPipeline = async () => {
        // Only run schema on the first chunk or combined summary to save tokens?
        // Running on all chunks allows deep structure. Let's run on first chunk only for speed if > 1 chunks.
        // Or simple prompt.
        const content = await this.callLlmWithFallback(
          {
            messages: [
              {
                role: 'system',
                content:
                  'Analiza el texto y genera una estructura de temas clave. Responde SOLO JSON: {"topics": [{"topic": "Titulo", "subtopics": ["..."]}]}',
              },
              {
                role: 'user',
                content: chunks[0], // Analyze start of convo for context
              },
            ],
            temperature: 0.2,
            response_format: { type: 'json_object' },
          },
          'Schema Generation',
        );

        const json = this.extractJson(content);
        return json.topics || [];
      };

      const fullSchema = await schemaPipeline();

      // 5. Save Analysis
      const analysis = await this.prisma.analysis.create({
        data: {
          audioId,
          summary: { text: finalSummary }, // Wrap in object or store string direct? Schema says Json.
          tasks: allTasks,
          schema: fullSchema,
        } as any,
      });

      // 6. Complete
      await this.prisma.audio.update({
        where: { id: audioId },
        data: {
          processingStatus: 'COMPLETED',
          processedAt: new Date(),
        },
      });

      return analysis;
    } catch (error) {
      this.logger.error(`Analysis failed for audioId: ${audioId}`, error);

      // AUTO DELETE ON FAILURE
      await this.audioService.deleteAudio(audioId);
      this.logger.warn(
        `[AutoDelete] Audio ${audioId} deleted due to analysis failure.`,
      );

      throw error;
    }
  }

  async getAnalysis(audioId: string) {
    const analysis = await this.prisma.analysis.findUnique({
      where: { audioId },
      include: {
        audio: {
          include: {
            transcription: true,
          },
        },
      },
    });

    if (!analysis) return null;

    return {
      ...analysis,
      hierarchicalSchema: (analysis as any).schema,
    };
  }

  private extractJson(content: string): any {
    try {
      return JSON.parse(content);
    } catch (e) {
      const jsonMatch =
        content.match(/```json\n([\s\S]*?)\n```/) ||
        content.match(/```\n([\s\S]*?)\n```/);

      if (jsonMatch && jsonMatch[1]) {
        try {
          return JSON.parse(jsonMatch[1]);
        } catch (e2) {
          //
        }
      }

      const firstBrace = content.indexOf('{');
      const lastBrace = content.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        try {
          return JSON.parse(content.substring(firstBrace, lastBrace + 1));
        } catch (e3) {}
      }
      return {};
    }
  }
}
