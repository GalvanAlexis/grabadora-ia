import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';

@Injectable()
export class AudioService {
  constructor(private prisma: PrismaService) {}

  async uploadAudio(file: Express.Multer.File, userId: string) {
    console.log(`[AudioService] Starting upload process for userId: ${userId}`);
    console.log(`[AudioService] File metadata:`, {
      originalname: file?.originalname,
      mimetype: file?.mimetype,
      size: file?.size,
      path: file?.path,
    });

    if (!file) {
      console.error('[AudioService] No file provided in request');
      throw new Error('No file provided');
    }

    try {
      // Direct Local Storage (Streaming Architecture)
      // The file is already saved by Multer to 'file.path' (e.g. "uploads/timestamp-name.m4a")
      // We just need to persist this path to the DB.

      const localPath = file.path; // Store relative path

      console.log(
        `[AudioService] Saving audio record to DB with path: ${localPath}`,
      );

      const audio = await this.prisma.audio.create({
        data: {
          userId,
          fileName: file.originalname,
          originalS3Key: localPath, // Using this field to store local path now
          mimeType: file.mimetype,
          fileSize: file.size,
          sampleRate: 44100,
          channels: 2,
          processingStatus: 'UPLOADED',
        },
      });

      console.log(`[AudioService] DB record created with ID: ${audio.id}`);

      return {
        id: audio.id,
        // No dropbox URL anymore. We return null or a local placeholder if needed.
        dropboxUrl: null,
        status: 'uploaded',
      };
    } catch (totalError) {
      console.error(
        `[AudioService] FATAL ERROR during uploadAudio:`,
        totalError,
      );
      // If DB creation fails, we should delete the file to avoid orphans
      if (file && fs.existsSync(file.path)) {
        try {
          fs.unlinkSync(file.path);
          console.log(`[AudioService] Cleaned up orphaned file: ${file.path}`);
        } catch (e) {
          console.warn(`[AudioService] Failed to cleanup orphaned file: ${e}`);
        }
      }
      throw totalError;
    }
  }

  async getAudioById(audioId: string) {
    return this.prisma.audio.findUnique({
      where: { id: audioId },
      include: {
        transcription: true,
        analysis: true,
        exports: true,
      },
    });
  }

  async listAudios(userId: string) {
    return this.prisma.audio.findMany({
      where: {
        userId,
        processingStatus: 'COMPLETED',
      },
      orderBy: { uploadedAt: 'desc' },
      select: {
        id: true,
        fileName: true,
        title: true,
        description: true,
        uploadedAt: true,
        processingStatus: true,
      },
    });
  }

  async updateAudio(
    id: string,
    data: { title?: string; description?: string },
  ) {
    return this.prisma.audio.update({
      where: { id },
      data,
    });
  }

  async deleteAudio(id: string) {
    const audio = await this.prisma.audio.findUnique({ where: { id } });
    if (audio) {
      // 1. Delete associated data first to handle DB constraints
      try {
        await this.prisma.$transaction([
          // Delete relations handled by onDelete: Cascade in Prisma Schema,
          // but explicit delete of the main record triggers the cascade.
          this.prisma.audio.delete({ where: { id } }),
        ]);
        console.log(`[AudioService] DB Record deleted for ID: ${id}`);
      } catch (dbError) {
        console.error(`[AudioService] Error deleting DB record: ${dbError}`);
        // If DB delete fails, we probably shouldn't try to delete the file yet?
        // Or if it was partially deleted? Let's proceed to try file delete anyway
        // if the intent was clean up.
      }

      // 2. Delete Physical File (Best Effort)
      if (audio.originalS3Key) {
        const filePath = audio.originalS3Key;
        if (fs.existsSync(filePath)) {
          try {
            // Retry logic for Windows file locking
            let retries = 3;
            while (retries > 0) {
              try {
                fs.unlinkSync(filePath);
                console.log(`[AudioService] Deleted file: ${filePath}`);
                break;
              } catch (e: any) {
                if (e.code === 'EBUSY' || e.code === 'EPERM') {
                  console.warn(
                    `[AudioService] File locked, retrying in 500ms... (${retries})`,
                  );
                  await new Promise((r) => setTimeout(r, 500));
                  retries--;
                } else {
                  throw e;
                }
              }
            }
          } catch (e) {
            console.error(
              `[AudioService] FAILED to delete file after retries: ${filePath}`,
              e,
            );
          }
        }
      }
    }
    return { status: 'deleted', id };
  }
}
