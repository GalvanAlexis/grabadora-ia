# Audio Processing SOP

## Objective

Process uploaded audio files through a deterministic pipeline: format conversion → transcription → AI analysis → multi-format export.

## Inputs

- Audio S3 key from BullMQ job payload
- Audio metadata from database (audioId, mimeType, sampleRate, etc.)

## Process Flow

### 1. Job Initialization

- Worker receives job from BullMQ queue
- Fetch Audio record from database
- Update status to `PROCESSING`
- Log start time

### 2. Download Audio from S3

- Download file to `.tmp/{audioId}/original.{ext}`
- Verify file integrity (size matches metadata)
- Handle download failures with retry (max 3 attempts)

### 3. Format Conversion (FFMPEG)

- Convert to PCM WAV format:
  - Sample rate: 16000 Hz (for voice recognition)
  - Channels: 1 (mono)
  - Format: float32 or int16
- Save to `.tmp/{audioId}/processed.wav`
- Extract audio metadata (actual duration, bitrate)

### 4. Transcription (OpenAI Whisper API)

- Call OpenAI API with `gpt-4o-transcribe-diarize` model
- Send processed WAV file
- For audio >30 seconds, set `chunking_strategy`
- Receive speaker-segmented transcription:

```json
{
  "segments": [
    {
      "speaker": "Speaker 1",
      "text": "Hello, this is a test.",
      "start": 0.0,
      "end": 2.5,
      "confidence": 0.95
    }
  ]
}
```

- Save to Transcription table

### 5. AI Analysis (GPT-4)

Send transcription to GPT-4 with structured prompts:

**A. Summary Extraction**

- Prompt: "Extract key points, annotations, and topics from this transcription"
- Response: `{ keyPoints: [], annotations: [], topics: [] }`

**B. Task Extraction**

- Prompt: "Identify and sequence actionable tasks from this conversation"
- Response: `[{ description, priority, sequence }]`

**C. Schema Generation**

- Prompt: "Create a hierarchical outline of this audio content"
- Response: `{ structure: [{ section, subsections, timestamp }] }`

- Save to Analysis table

### 6. Multi-Format Export Generation

Call `export_generator.py` tool to create all formats:

- JSON (structured data)
- TXT (plain text)
- MD (formatted markdown)
- SRT (video subtitles)
- VTT (web video subtitles)
- CSV (tabular data)
- XML (enterprise format)
- CONLL (linguistic analysis)
- EAF (ELAN annotation)
- HTML (web display)

### 7. Cloud Upload

- Upload all export files to Google Drive/Dropbox
- Save URLs to Export table (one record per format)

### 8. Cleanup & Finalization

- Delete temporary files from `.tmp/{audioId}/`
- Update Audio record:
  - `processingStatus = COMPLETED`
  - `processedAt = now()`
- Log completion time and metrics

## Edge Cases

### API Failures

**OpenAI Whisper API Timeout**

- Retry with exponential backoff (max 3 attempts)
- If all retries fail:
  - Mark status as `FAILED`
  - Log error details
  - Notify monitoring system

**GPT-4 Rate Limiting**

- Implement queue-based retry with delay
- Use fallback prompts if primary fails

### Unsupported Audio Formats

- FFMPEG conversion failure:
  - Log format details
  - Mark as `FAILED` with error message
  - Return user-friendly error

### Long Audio Files (>1 hour)

- Split into chunks for Whisper API
- Process chunks sequentially
- Merge transcriptions with timestamp alignment

### Low Confidence Transcription

- If average confidence <0.7:
  - Flag in metadata
  - Optionally request human review

### Cloud Storage Quota Exceeded

- Catch upload errors
- Mark exports as pending
- Implement retry job for failed uploads

## Success Criteria

- Audio successfully transcribed with speaker labels
- Analysis data (summary, tasks, schema) generated
- All 10 export formats created and uploaded
- Database fully updated
- Temporary files cleaned up

## Monitoring

- Track processing time per audio duration
- Monitor API success/failure rates
- Alert on repeated failures
- Track export generation success rates

## Performance Targets

- Processing time: <2x audio duration
- API success rate: >99%
- Export generation: <30 seconds
