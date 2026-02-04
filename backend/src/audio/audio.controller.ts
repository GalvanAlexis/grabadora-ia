import {
  Controller,
  Post,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
  Patch,
  Delete,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AudioService } from './audio.service';
import { diskStorage } from 'multer';
import { CreateAudioDto } from './dto/create-audio.dto';

@Controller('audio')
export class AudioController {
  constructor(private readonly audioService: AudioService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + '-' + file.originalname);
        },
      }),
      limits: {
        fileSize: 200 * 1024 * 1024, // 200MB limit
      },
    }),
  )
  async uploadAudio(
    @UploadedFile() file: Express.Multer.File,
    @Body() createAudioDto: CreateAudioDto,
  ) {
    const { userId } = createAudioDto;
    console.log(`[AudioController] POST /upload received. userId: ${userId}`);

    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!userId) {
      console.error('[AudioController] Missing userId in request body');
      throw new BadRequestException('userId is required');
    }
    return this.audioService.uploadAudio(file, userId);
  }

  @Get(':id')
  async getAudio(@Param('id') id: string) {
    return this.audioService.getAudioById(id);
  }

  @Get('user/:userId')
  async listAudios(@Param('userId') userId: string) {
    return this.audioService.listAudios(userId);
  }

  @Patch(':id')
  async updateAudio(
    @Param('id') id: string,
    @Body() data: { title?: string; description?: string },
  ) {
    return this.audioService.updateAudio(id, data);
  }

  @Delete(':id')
  async deleteAudio(@Param('id') id: string) {
    console.log(`[AudioController] DELETE request for id: ${id}`);
    return this.audioService.deleteAudio(id);
  }
}
