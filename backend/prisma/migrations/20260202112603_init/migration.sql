-- CreateTable
CREATE TABLE "Audio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalS3Key" TEXT NOT NULL,
    "processedS3Key" TEXT,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "duration" REAL,
    "sampleRate" INTEGER NOT NULL,
    "channels" INTEGER NOT NULL,
    "processingStatus" TEXT NOT NULL DEFAULT 'UPLOADED',
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Transcription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "audioId" TEXT NOT NULL,
    "segments" JSONB NOT NULL,
    "fullText" TEXT NOT NULL,
    "speakerCount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transcription_audioId_fkey" FOREIGN KEY ("audioId") REFERENCES "Audio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Analysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "audioId" TEXT NOT NULL,
    "summary" JSONB NOT NULL,
    "tasks" JSONB NOT NULL,
    "schema" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Analysis_audioId_fkey" FOREIGN KEY ("audioId") REFERENCES "Audio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Export" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "audioId" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "cloudUrl" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Export_audioId_fkey" FOREIGN KEY ("audioId") REFERENCES "Audio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Audio_userId_idx" ON "Audio"("userId");

-- CreateIndex
CREATE INDEX "Audio_processingStatus_idx" ON "Audio"("processingStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Transcription_audioId_key" ON "Transcription"("audioId");

-- CreateIndex
CREATE INDEX "Transcription_audioId_idx" ON "Transcription"("audioId");

-- CreateIndex
CREATE UNIQUE INDEX "Analysis_audioId_key" ON "Analysis"("audioId");

-- CreateIndex
CREATE INDEX "Analysis_audioId_idx" ON "Analysis"("audioId");

-- CreateIndex
CREATE INDEX "Export_audioId_idx" ON "Export"("audioId");

-- CreateIndex
CREATE INDEX "Export_format_idx" ON "Export"("format");
