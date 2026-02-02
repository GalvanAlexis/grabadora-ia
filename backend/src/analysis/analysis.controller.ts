import { Controller, Post, Get, Param } from '@nestjs/common';
import { AnalysisService } from './analysis.service';

@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post(':audioId')
  async analyze(@Param('audioId') audioId: string) {
    return this.analysisService.analyzeTranscription(audioId);
  }

  @Get(':audioId')
  async getAnalysis(@Param('audioId') audioId: string) {
    return this.analysisService.getAnalysis(audioId);
  }
}
