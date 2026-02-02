import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async onModuleInit() {
    await this.prisma.$connect();
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }

  // Expose Prisma Client methods
  get audio() {
    return this.prisma.audio;
  }

  get transcription() {
    return this.prisma.transcription;
  }

  get analysis() {
    return this.prisma.analysis;
  }

  get export() {
    return this.prisma.export;
  }
}
