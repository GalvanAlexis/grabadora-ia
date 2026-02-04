import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createClient } from '@deepgram/sdk';
import * as fs from 'fs';

@Injectable()
export class TranscriptionService {
  private deepgram: ReturnType<typeof createClient>;

  constructor(private prisma: PrismaService) {
    // Initialize Deepgram client
    this.deepgram = createClient(process.env.DEEPGRAM_API_KEY);
  }

  async transcribeAudio(audioId: string) {
    // 1. Get audio from database
    const audio = await this.prisma.audio.findUnique({
      where: { id: audioId },
    });

    if (!audio) {
      throw new Error('Audio not found');
    }

    // 2. Validate Local File
    const filePath = audio.originalS3Key; // This is now the local path (e.g. "uploads/...")

    if (!fs.existsSync(filePath)) {
      console.error(
        `[TranscriptionService] File not found at path: ${filePath}`,
      );
      await this.prisma.audio.update({
        where: { id: audioId },
        data: { processingStatus: 'FAILED' },
      });
      throw new Error(`File not found at path: ${filePath}`);
    }

    try {
      // 3. Transcribe with Deepgram (Streaming from Disk)
      console.log(
        `[TranscriptionService] Streaming file to Deepgram: ${filePath}`,
      );
      const fileStream = fs.createReadStream(filePath);

      const { result, error } =
        await this.deepgram.listen.prerecorded.transcribeFile(fileStream, {
          model: 'nova-2',
          smart_format: true,
          diarize: true,
          punctuate: true,
          utterances: true,
          language: 'es',
        });

      if (error) {
        throw new Error(`Deepgram error: ${error.message}`);
      }

      // 4. Process results
      const transcript = result.results.channels[0].alternatives[0];
      const utterances = result.results.utterances || [];

      // Extract speaker segments
      const segments = utterances.map((utterance) => ({
        speaker: utterance.speaker,
        start: utterance.start,
        end: utterance.end,
        text: utterance.transcript,
      }));

      // Count unique speakers
      const uniqueSpeakers = new Set(utterances.map((u) => u.speaker));
      const speakerCount = uniqueSpeakers.size;

      // 5. Save transcription to database
      const savedTranscription = await this.prisma.transcription.create({
        data: {
          audioId,
          segments: segments as any,
          fullText: transcript.transcript,
          speakerCount,
        },
      });

      // 6. Update audio status
      await this.prisma.audio.update({
        where: { id: audioId },
        data: {
          processingStatus: 'COMPLETED',
          processedAt: new Date(),
        },
      });

      console.log(
        `[TranscriptionService] Transcription completed for ID: ${audioId}`,
      );

      // Note: We do NOT delete the file here anymore, as it is the master copy.
      // If we want to save space later, we could add a cleanup job for old files.

      return savedTranscription;
    } catch (error) {
      console.error(`[TranscriptionService] Transcription failed:`, error);

      // AUTO DELETE ON FAILURE
      // We need to inject AudioService to do this proper, but circular dependency might be an issue
      // if AudioService depends on TranscriptionService.
      // For now, let's manually delete the DB record and file to break potential cycles if not careful,
      // OR better: Just mark logic here to call the same cleanup routine.

      // Let's use the Prisma delete directly here to avoid circular dependency hell for now,
      // duplicating the logic slightly but safe.
      try {
        // Hard delete from DB
        await this.prisma.audio.delete({ where: { id: audioId } });

        // Delete file
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {}
        }
        console.log(
          `[TranscriptionService] Auto-deleted failed audio: ${audioId}`,
        );
      } catch (cleanupError) {
        console.error(
          `[TranscriptionService] Failed to cleanup after error:`,
          cleanupError,
        );
      }

      throw error;
    }
  }

  async getTranscription(audioId: string) {
    return this.prisma.transcription.findUnique({
      where: { audioId },
      include: { audio: true },
    });
  }
}
