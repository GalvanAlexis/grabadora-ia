import { Controller, Post, Get, Param } from '@nestjs/common';
import { ExportService } from './export.service';
import type { ExportFormat } from './export.service';

@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post(':audioId/:format')
  async generateExport(
    @Param('audioId') audioId: string,
    @Param('format') format: ExportFormat,
  ) {
    return this.exportService.generateExport(audioId, format);
  }

  @Get(':exportId')
  async getExport(@Param('exportId') exportId: string) {
    return this.exportService.getExport(exportId);
  }

  @Get('audio/:audioId')
  async listExports(@Param('audioId') audioId: string) {
    return this.exportService.listExports(audioId);
  }
}
