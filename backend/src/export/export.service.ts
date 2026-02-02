import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as Dropbox from 'dropbox';
import * as fs from 'fs';

export type ExportFormat =
  | 'json'
  | 'txt'
  | 'md'
  | 'srt'
  | 'vtt'
  | 'csv'
  | 'xml'
  | 'conll'
  | 'eaf'
  | 'html';

interface ExportData {
  audio: any;
  transcription: any;
  analysis: any;
}

@Injectable()
export class ExportService {
  private dbx: Dropbox.Dropbox;

  constructor(private prisma: PrismaService) {
    // Initialize Dropbox client
    this.dbx = new Dropbox.Dropbox({
      accessToken: process.env.DROPBOX_ACCESS_TOKEN,
    });
  }

  async generateExport(audioId: string, format: ExportFormat) {
    // 1. Get all data
    const audio = await this.prisma.audio.findUnique({
      where: { id: audioId },
      include: {
        transcription: true,
        analysis: true,
      },
    });

    if (!audio) {
      throw new Error('Audio not found');
    }

    if (!audio.transcription) {
      throw new Error(
        'Transcription not found. Please transcribe the audio first.',
      );
    }

    const data: ExportData = {
      audio,
      transcription: audio.transcription,
      analysis: audio.analysis,
    };

    // 2. Generate content based on format
    let content: string;
    let extension: string;
    let mimeType: string;

    switch (format) {
      case 'json':
        content = this.generateJSON(data);
        extension = 'json';
        mimeType = 'application/json';
        break;
      case 'txt':
        content = this.generateTXT(data);
        extension = 'txt';
        mimeType = 'text/plain';
        break;
      case 'md':
        content = this.generateMD(data);
        extension = 'md';
        mimeType = 'text/markdown';
        break;
      case 'srt':
        content = this.generateSRT(data);
        extension = 'srt';
        mimeType = 'application/x-subrip';
        break;
      case 'vtt':
        content = this.generateVTT(data);
        extension = 'vtt';
        mimeType = 'text/vtt';
        break;
      case 'csv':
        content = this.generateCSV(data);
        extension = 'csv';
        mimeType = 'text/csv';
        break;
      case 'xml':
        content = this.generateXML(data);
        extension = 'xml';
        mimeType = 'application/xml';
        break;
      case 'conll':
        content = this.generateCONLL(data);
        extension = 'conll';
        mimeType = 'text/plain';
        break;
      case 'eaf':
        content = this.generateEAF(data);
        extension = 'eaf';
        mimeType = 'application/xml';
        break;
      case 'html':
        content = this.generateHTML(data);
        extension = 'html';
        mimeType = 'text/html';
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    // 3. Upload to Dropbox
    const timestamp = Date.now();
    const filename = `${audio.fileName.replace(/\.[^/.]+$/, '')}_${format}_${timestamp}.${extension}`;
    const dropboxPath = `/exports/${audioId}/${filename}`;

    const uploadResponse = await this.dbx.filesUpload({
      path: dropboxPath,
      contents: Buffer.from(content, 'utf-8'),
    });

    // 4. Create shared link
    const sharedLinkResponse =
      await this.dbx.sharingCreateSharedLinkWithSettings({
        path: uploadResponse.result.path_display || dropboxPath,
      });

    // 5. Save to database
    const exportRecord = await this.prisma.export.create({
      data: {
        audioId,
        format: format.toUpperCase() as any,
        cloudUrl: sharedLinkResponse.result.url,
      },
    });

    return exportRecord;
  }

  // ==================== FORMAT GENERATORS ====================

  private generateJSON(data: ExportData): string {
    return JSON.stringify(
      {
        audio: {
          id: data.audio.id,
          fileName: data.audio.fileName,
          duration: data.audio.duration,
          createdAt: data.audio.createdAt,
        },
        transcription: {
          fullText: data.transcription.fullText,
          segments: data.transcription.segments,
          speakerCount: data.transcription.speakerCount,
        },
        analysis: data.analysis
          ? {
              summary: data.analysis.summary,
              tasks: data.analysis.tasks,
              hierarchicalSchema: data.analysis.hierarchicalSchema,
            }
          : null,
      },
      null,
      2,
    );
  }

  private generateTXT(data: ExportData): string {
    let content = '';

    // Header
    content += `TRANSCRIPCIÓN DE AUDIO\n`;
    content += `Archivo: ${data.audio.fileName}\n`;
    content += `Fecha: ${new Date(data.audio.createdAt).toLocaleString('es-ES')}\n`;
    content += `\n${'='.repeat(60)}\n\n`;

    // Transcription
    content += `TRANSCRIPCIÓN COMPLETA:\n\n`;
    content += data.transcription.fullText + '\n\n';

    // Analysis
    if (data.analysis) {
      content += `${'='.repeat(60)}\n\n`;
      content += `RESUMEN:\n\n`;
      content += data.analysis.summary + '\n\n';

      if (
        data.analysis.tasks &&
        Array.isArray(data.analysis.tasks) &&
        data.analysis.tasks.length > 0
      ) {
        content += `${'='.repeat(60)}\n\n`;
        content += `TAREAS:\n\n`;
        data.analysis.tasks.forEach((task: any, index: number) => {
          content += `${index + 1}. ${task.task || task.description || JSON.stringify(task)}\n`;
          if (task.assignee) {
            content += `   Asignado a: ${task.assignee}\n`;
          }
        });
      }
    }

    return content;
  }

  private generateMD(data: ExportData): string {
    let content = '';

    // Header
    content += `# Transcripción de Audio\n\n`;
    content += `**Archivo:** ${data.audio.fileName}  \n`;
    content += `**Fecha:** ${new Date(data.audio.createdAt).toLocaleString('es-ES')}  \n`;
    content += `**Speakers:** ${data.transcription.speakerCount || 'No especificado'}\n\n`;

    content += `---\n\n`;

    // Transcription
    content += `## Transcripción Completa\n\n`;

    if (
      data.transcription.segments &&
      Array.isArray(data.transcription.segments)
    ) {
      data.transcription.segments.forEach((segment: any) => {
        const speaker =
          segment.speaker !== undefined
            ? `**Speaker ${segment.speaker}:**`
            : '';
        const time =
          segment.start !== undefined
            ? `[${this.formatTime(segment.start)}]`
            : '';
        content += `${time} ${speaker} ${segment.text || segment.transcript || ''}\n\n`;
      });
    } else {
      content += data.transcription.fullText + '\n\n';
    }

    // Analysis
    if (data.analysis) {
      content += `---\n\n`;
      content += `## Resumen\n\n`;
      content += data.analysis.summary + '\n\n';

      if (
        data.analysis.tasks &&
        Array.isArray(data.analysis.tasks) &&
        data.analysis.tasks.length > 0
      ) {
        content += `## Tareas\n\n`;
        data.analysis.tasks.forEach((task: any) => {
          const taskText =
            task.task || task.description || JSON.stringify(task);
          const assignee = task.assignee ? ` (${task.assignee})` : '';
          content += `- [ ] ${taskText}${assignee}\n`;
        });
        content += `\n`;
      }

      if (
        data.analysis.hierarchicalSchema &&
        Array.isArray(data.analysis.hierarchicalSchema)
      ) {
        content += `## Esquema Jerárquico\n\n`;
        data.analysis.hierarchicalSchema.forEach((topic: any) => {
          content += `### ${topic.topic || topic.name || 'Tema'}\n\n`;
          if (topic.subtopics && Array.isArray(topic.subtopics)) {
            topic.subtopics.forEach((subtopic: string) => {
              content += `- ${subtopic}\n`;
            });
          }
          content += `\n`;
        });
      }
    }

    return content;
  }

  private generateSRT(data: ExportData): string {
    let content = '';
    let index = 1;

    if (
      !data.transcription.segments ||
      !Array.isArray(data.transcription.segments)
    ) {
      throw new Error('Segments not available for SRT generation');
    }

    data.transcription.segments.forEach((segment: any) => {
      const start = this.formatSRTTime(segment.start || 0);
      const end = this.formatSRTTime(segment.end || segment.start + 5);
      const text = segment.text || segment.transcript || '';

      content += `${index}\n`;
      content += `${start} --> ${end}\n`;
      content += `${text}\n\n`;
      index++;
    });

    return content;
  }

  private generateVTT(data: ExportData): string {
    let content = 'WEBVTT\n\n';

    if (
      !data.transcription.segments ||
      !Array.isArray(data.transcription.segments)
    ) {
      throw new Error('Segments not available for VTT generation');
    }

    data.transcription.segments.forEach((segment: any) => {
      const start = this.formatVTTTime(segment.start || 0);
      const end = this.formatVTTTime(segment.end || segment.start + 5);
      const text = segment.text || segment.transcript || '';
      const speaker =
        segment.speaker !== undefined ? `<v Speaker ${segment.speaker}>` : '';

      content += `${start} --> ${end}\n`;
      content += `${speaker}${text}\n\n`;
    });

    return content;
  }

  private generateCSV(data: ExportData): string {
    let content = 'Speaker,Start,End,Text\n';

    if (
      !data.transcription.segments ||
      !Array.isArray(data.transcription.segments)
    ) {
      throw new Error('Segments not available for CSV generation');
    }

    data.transcription.segments.forEach((segment: any) => {
      const speaker =
        segment.speaker !== undefined
          ? `Speaker ${segment.speaker}`
          : 'Unknown';
      const start = segment.start || 0;
      const end = segment.end || start + 5;
      const text = (segment.text || segment.transcript || '').replace(
        /"/g,
        '""',
      );

      content += `"${speaker}",${start},${end},"${text}"\n`;
    });

    return content;
  }

  private generateXML(data: ExportData): string {
    // Placeholder - will implement with xml-js
    return `<?xml version="1.0" encoding="UTF-8"?>
<transcription>
  <audio>
    <fileName>${data.audio.fileName}</fileName>
    <createdAt>${data.audio.createdAt}</createdAt>
  </audio>
  <text>${this.escapeXML(data.transcription.fullText)}</text>
</transcription>`;
  }

  private generateCONLL(data: ExportData): string {
    // Simplified CONLL format (token-based)
    return `# CONLL Format - Simplified\n# Audio: ${data.audio.fileName}\n\n${data.transcription.fullText}`;
  }

  private generateEAF(data: ExportData): string {
    // Placeholder for ELAN Annotation Format
    return `<?xml version="1.0" encoding="UTF-8"?>
<ANNOTATION_DOCUMENT>
  <HEADER MEDIA_FILE="${data.audio.fileName}" TIME_UNITS="milliseconds"/>
</ANNOTATION_DOCUMENT>`;
  }

  private generateHTML(data: ExportData): string {
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Transcripción - ${data.audio.fileName}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
    h1 { color: #333; }
    .segment { margin: 15px 0; padding: 10px; background: #f5f5f5; border-radius: 5px; }
    .speaker { font-weight: bold; color: #0066cc; }
    .time { color: #666; font-size: 0.9em; }
  </style>
</head>
<body>
  <h1>Transcripción de Audio</h1>
  <p><strong>Archivo:</strong> ${data.audio.fileName}</p>
  <p><strong>Fecha:</strong> ${new Date(data.audio.createdAt).toLocaleString('es-ES')}</p>
  <hr>
  <h2>Transcripción</h2>
  ${this.generateHTMLSegments(data.transcription)}
  ${data.analysis ? `<hr><h2>Resumen</h2><p>${data.analysis.summary}</p>` : ''}
</body>
</html>`;
  }

  // ==================== HELPER METHODS ====================

  private generateHTMLSegments(transcription: any): string {
    if (!transcription.segments || !Array.isArray(transcription.segments)) {
      return `<p>${transcription.fullText}</p>`;
    }

    return transcription.segments
      .map((segment: any) => {
        const speaker =
          segment.speaker !== undefined
            ? `<span class="speaker">Speaker ${segment.speaker}:</span>`
            : '';
        const time =
          segment.start !== undefined
            ? `<span class="time">[${this.formatTime(segment.start)}]</span>`
            : '';
        const text = segment.text || segment.transcript || '';
        return `<div class="segment">${time} ${speaker} ${text}</div>`;
      })
      .join('\n');
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  private formatSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  }

  private formatVTTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }

  private escapeXML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  async getExport(exportId: string) {
    return this.prisma.export.findUnique({
      where: { id: exportId },
      include: { audio: true },
    });
  }

  async listExports(audioId: string) {
    return this.prisma.export.findMany({
      where: { audioId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
