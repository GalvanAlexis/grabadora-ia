import { Controller, Post, Get, Param } from '@nestjs/common';
import { TranscriptionService } from './transcription.service';

@Controller('transcription')
export class TranscriptionController {
  constructor(private readonly transcriptionService: TranscriptionService) {}

  @Post(':audioId')
  async transcribe(@Param('audioId') audioId: string) {
    return this.transcriptionService.transcribeAudio(audioId);
  }

  @Get(':audioId')
  async getTranscription(@Param('audioId') audioId: string) {
    return this.transcriptionService.getTranscription(audioId);
  }
}
