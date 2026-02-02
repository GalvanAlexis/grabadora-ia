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
    // 1. Upload to Dropbox
    const fileName = `${Date.now()}-${file.originalname}`;
    const dropboxPath = `/audios/${fileName}`;

    const fileContent = fs.readFileSync(file.path);

    const uploadResponse = await this.dbx.filesUpload({
      path: dropboxPath,
      contents: fileContent,
    });

    // 2. Create shared link
    const sharedLinkResponse =
      await this.dbx.sharingCreateSharedLinkWithSettings({
        path: uploadResponse.result.path_display || dropboxPath,
      });

    // 3. Save to database
    const audio = await this.prisma.audio.create({
      data: {
        userId,
        fileName: file.originalname,
        originalS3Key: dropboxPath,
        mimeType: file.mimetype,
        fileSize: file.size,
        sampleRate: 44100, // Default, will be updated after processing
        channels: 2,
        processingStatus: 'UPLOADED',
      },
    });

    // 4. Clean up temp file
    fs.unlinkSync(file.path);

    return {
      audioId: audio.id,
      dropboxUrl: sharedLinkResponse.result.url,
      status: 'uploaded',
    };
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
