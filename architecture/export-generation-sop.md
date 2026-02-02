# Multi-Format Export Generation SOP

## Objective

Generate and upload transcription exports in all supported formats to cloud storage, ensuring each format correctly represents the data according to its specification.

## Inputs

- Transcription data (segments with speaker labels, timestamps, text)
- Analysis data (summary, tasks, hierarchical schema)
- Audio metadata (duration, speaker count, etc.)

## Supported Formats

### 1. JSON (NLP/IA Processing)

**Purpose:** Structured data for machine learning and NLP pipelines

**Structure:**

```json
{
  "audioId": "uuid",
  "metadata": { ... },
  "transcription": {
    "segments": [ ... ],
    "fullText": "..."
  },
  "analysis": {
    "summary": { ... },
    "tasks": [ ... ],
    "schema": { ... }
  }
}
```

### 2. TXT (Human Editing)

**Purpose:** Plain text for manual editing

**Format:**

```
[Speaker 1] (00:00 - 00:05): Hello, this is a test.
[Speaker 2] (00:05 - 00:10): Yes, I can hear you clearly.
```

### 3. MD (Markdown - Human Readable)

**Purpose:** Formatted documentation with headings and structure

**Format:**

```markdown
# Audio Transcription

## Metadata

- Duration: 5:30
- Speakers: 2
- Date: 2026-01-30

## Transcription

### Speaker 1 (00:00)

Hello, this is a test.

## Summary

- Key point 1
- Key point 2

## Tasks

1. [ ] Task 1
2. [ ] Task 2
```

### 4. SRT (SubRip Subtitles)

**Purpose:** Video subtitle format

**Format:**

```
1
00:00:00,000 --> 00:00:05,000
[Speaker 1] Hello, this is a test.

2
00:00:05,000 --> 00:00:10,000
[Speaker 2] Yes, I can hear you clearly.
```

### 5. VTT (WebVTT Subtitles)

**Purpose:** Web video subtitle format

**Format:**

```
WEBVTT

00:00:00.000 --> 00:00:05.000
<v Speaker 1>Hello, this is a test.

00:00:05.000 --> 00:00:10.000
<v Speaker 2>Yes, I can hear you clearly.
```

### 6. CSV (Data Science)

**Purpose:** Tabular data for analysis in Excel/Pandas

**Format:**

```csv
speaker,start_time,end_time,text,confidence
Speaker 1,0.0,5.0,"Hello, this is a test.",0.95
Speaker 2,5.0,10.0,"Yes, I can hear you clearly.",0.98
```

### 7. XML (Enterprise)

**Purpose:** Enterprise systems integration

**Format:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<transcription>
  <metadata>
    <audioId>uuid</audioId>
    <duration>330</duration>
  </metadata>
  <segments>
    <segment>
      <speaker>Speaker 1</speaker>
      <start>0.0</start>
      <end>5.0</end>
      <text>Hello, this is a test.</text>
    </segment>
  </segments>
</transcription>
```

### 8. CONLL (Linguistic Analysis)

**Purpose:** CoNLL format for NLP research

**Format:**

```
# speaker = Speaker 1
# start = 0.0
# end = 5.0
1    Hello    _    _    _    _
2    ,        _    _    _    _
3    this     _    _    _    _
```

### 9. EAF (ELAN Annotation Format)

**Purpose:** Linguistic research with ELAN software

**Format:** XML-based annotation format with time slots and tiers for each speaker

### 10. HTML (Web Display)

**Purpose:** Web-ready formatted output

**Format:**

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Transcription</title>
    <style>
      /* Styling */
    </style>
  </head>
  <body>
    <h1>Audio Transcription</h1>
    <div class="segment">
      <span class="speaker">Speaker 1</span>
      <span class="timestamp">00:00</span>
      <p>Hello, this is a test.</p>
    </div>
  </body>
</html>
```

## Process Flow

### 1. Data Preparation

- Fetch complete transcription and analysis from database
- Validate data completeness
- Prepare metadata object

### 2. Format Generation

For each format:

- Call format-specific generator function
- Validate output against format specification
- Save to `.tmp/{audioId}/exports/{format}.{ext}`

### 3. Batch Upload

- Upload all files to Google Drive/Dropbox in parallel
- Generate shareable links for each file
- Save URLs to Export table (one record per format)

### 4. Cleanup

- Delete temporary export files
- Log generation metrics

## Edge Cases

### Cloud Storage Quota Exceeded

- Catch quota errors
- Mark exports as pending
- Implement retry job with exponential backoff
- Alert administrator

### Authentication Failures

- Refresh OAuth tokens automatically
- Retry upload after token refresh
- If refresh fails, alert and queue for manual intervention

### Format-Specific Validation Errors

**SRT/VTT Timestamp Issues**

- Ensure timestamps are sequential
- Handle overlapping segments by adjusting end times

**XML Invalid Characters**

- Escape special characters: `<`, `>`, `&`, `"`, `'`
- Validate against XML schema

**CSV Delimiter Conflicts**

- Escape commas in text fields
- Use quotes for text containing delimiters

**CONLL Format Errors**

- Ensure proper tokenization
- Handle multi-word expressions

### Large Export Files (>10MB)

- Compress before upload (gzip)
- Use chunked upload for very large files

## Success Criteria

- All 10 formats generated successfully
- Each format validates against its specification
- All files uploaded to cloud storage
- URLs saved to database
- Temporary files cleaned up

## Monitoring

- Track generation time per format
- Monitor upload success rates
- Alert on repeated failures
- Track cloud storage usage

## Performance Targets

- Generation time: <30 seconds for all formats
- Upload success rate: >99%
- Format validation: 100% pass rate
