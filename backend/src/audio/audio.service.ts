import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as Dropbox from 'dropbox';
import * as fs from 'fs';

@Injectable()
export class AudioService {
  private dbx: Dropbox.Dropbox;

  constructor(private prisma: PrismaService) {
    // Initialize Dropbox client
    this.dbx = new Dropbox.Dropbox({
      accessToken: process.env.DROPBOX_ACCESS_TOKEN,
    });
  }

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
      // 1. Upload to Dropbox
      const fileName = `${Date.now()}-${file.originalname}`;
      const dropboxPath = `/audios/${fileName}`;
      console.log(
        `[AudioService] Attempting to upload to Dropbox at: ${dropboxPath}`,
      );

      let fileContent: Buffer;
      try {
        fileContent = await fs.promises.readFile(file.path);
        console.log(
          `[AudioService] Successfully read local file (async): ${file.path}`,
        );
      } catch (fsError) {
        console.error(
          `[AudioService] Failed to read local file at ${file.path}:`,
          fsError,
        );
        throw fsError;
      }

      let uploadResponse;
      try {
        uploadResponse = await this.dbx.filesUpload({
          path: dropboxPath,
          contents: fileContent,
        });
        console.log(
          `[AudioService] Dropbox upload successful: ${uploadResponse.result.path_display}`,
        );
      } catch (dbxError) {
        console.error(
          `[AudioService] Dropbox upload failed. Error details:`,
          JSON.stringify(dbxError, null, 2),
        );
        throw dbxError;
      }

      // 2. Create shared link
      let sharedLinkResponse;
      try {
        console.log(
          `[AudioService] Creating shared link for: ${uploadResponse.result.path_display}`,
        );
        sharedLinkResponse = await this.dbx.sharingCreateSharedLinkWithSettings(
          {
            path: uploadResponse.result.path_display || dropboxPath,
          },
        );
        console.log(
          `[AudioService] Shared link created: ${sharedLinkResponse.result.url}`,
        );
      } catch (sharingError) {
        console.error(
          `[AudioService] Failed to create shared link:`,
          JSON.stringify(sharingError, null, 2),
        );
        // We might choose to continue or fail here. Let's fail for now to ensure visibility.
        throw sharingError;
      }

      // 3. Save to database
      let audio;
      try {
        console.log(
          `[AudioService] Saving audio record to DB for userId: ${userId}`,
        );
        audio = await this.prisma.audio.create({
          data: {
            userId,
            fileName: file.originalname,
            originalS3Key: dropboxPath,
            mimeType: file.mimetype,
            fileSize: file.size,
            sampleRate: 44100,
            channels: 2,
            processingStatus: 'UPLOADED',
          },
        });
        console.log(`[AudioService] DB record created with ID: ${audio.id}`);
      } catch (prismaError) {
        console.error(
          `[AudioService] Prisma failed to create audio record:`,
          prismaError,
        );
        throw prismaError;
      }

      // 4. Clean up temp file
      try {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
          console.log(`[AudioService] Cleaned up temp file: ${file.path}`);
        }
      } catch (cleanupError) {
        console.warn(
          `[AudioService] Failed to cleanup temp file at ${file.path}:`,
          cleanupError,
        );
        // Don't throw here, the upload was successful
      }

      return {
        audioId: audio.id,
        dropboxUrl: sharedLinkResponse.result.url,
        status: 'uploaded',
      };
    } catch (totalError) {
      console.error(
        `[AudioService] FATAL ERROR during uploadAudio:`,
        totalError,
      );
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
}
