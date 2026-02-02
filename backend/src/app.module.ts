import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AudioModule } from './audio/audio.module';
import { TranscriptionModule } from './transcription/transcription.module';
import { AnalysisModule } from './analysis/analysis.module';
import { ExportModule } from './export/export.module';

@Module({
  imports: [
    PrismaModule,
    AudioModule,
    TranscriptionModule,
    AnalysisModule,
    ExportModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
