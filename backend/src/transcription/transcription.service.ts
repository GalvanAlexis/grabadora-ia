import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createClient } from '@deepgram/sdk';
import * as fs from 'fs';
import * as Dropbox from 'dropbox';

@Injectable()
export class TranscriptionService {
  private deepgram: ReturnType<typeof createClient>;
  private dbx: Dropbox.Dropbox;

  constructor(private prisma: PrismaService) {
    // Initialize Deepgram client
    this.deepgram = createClient(process.env.DEEPGRAM_API_KEY);

    // Initialize Dropbox
    this.dbx = new Dropbox.Dropbox({
      accessToken: process.env.DROPBOX_ACCESS_TOKEN,
    });
  }

  async transcribeAudio(audioId: string) {
    // 1. Get audio from database
    const audio = await this.prisma.audio.findUnique({
      where: { id: audioId },
    });

    if (!audio) {
      throw new Error('Audio not found');
    }

    // 2. Download from Dropbox
    const downloadResponse = await this.dbx.filesDownload({
      path: audio.originalS3Key,
    });

    // @ts-ignore - Dropbox SDK types issue
    const fileBlob = downloadResponse.result.fileBlob;
    const buffer = await fileBlob.arrayBuffer();

    // Save temporarily (Async)
    const tempPath = `./uploads/temp-${audioId}.mp3`;
    await fs.promises.writeFile(tempPath, Buffer.from(buffer));

    try {
      // 3. Transcribe with Deepgram (with speaker diarization)
      // Using ReadStream to reduce memory usage during read
      const fileStream = fs.createReadStream(tempPath);

      const { result, error } =
        await this.deepgram.listen.prerecorded.transcribeFile(fileStream, {
          model: 'nova-2',
          smart_format: true,
          diarize: true, // Enable speaker diarization
          punctuate: true,
          utterances: true,
          language: 'es', // Spanish by default, can be made dynamic
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

      // 7. Clean up temp file
      try {
        await fs.promises.unlink(tempPath);
      } catch (e) {
        console.warn(`Failed to delete temp file ${tempPath}:`, e);
      }

      return savedTranscription;
    } catch (error) {
      // Clean up on error
      if (fs.existsSync(tempPath)) {
        try {
          await fs.promises.unlink(tempPath);
        } catch (e) {
          console.warn(`Failed to delete temp file ${tempPath} on error:`, e);
        }
      }

      // Update status to failed
      await this.prisma.audio.update({
        where: { id: audioId },
        data: { processingStatus: 'FAILED' },
      });

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
