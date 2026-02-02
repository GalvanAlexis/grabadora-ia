# Audio Upload SOP

## Objective

Securely upload audio files to AWS S3 using pre-signed URLs to avoid routing large files through the NestJS server.

## Inputs

- Audio file metadata from client (fileName, mimeType, fileSize, sampleRate, channels)
- User authentication token (JWT)

## Process Flow

### 1. Client Request

Client sends POST request to `/api/v1/audio/upload` with metadata:

```json
{
  "fileName": "recording.mp3",
  "mimeType": "audio/mpeg",
  "fileSize": 2048000,
  "sampleRate": 44100,
  "channels": 2
}
```

### 2. Server Validation

- Verify JWT token
- Validate file metadata:
  - Supported MIME types: `audio/wav`, `audio/mpeg`, `audio/ogg`, `audio/aac`, `audio/webm`
  - Max file size: 100MB (configurable)
  - Sample rate: 16000 Hz (voice) or 44100 Hz (general audio)

### 3. Generate Pre-signed URL

- Generate unique S3 key: `audio/{userId}/{timestamp}-{uuid}.{ext}`
- Create pre-signed PUT URL with 15-minute expiration
- Return to client:

```json
{
  "audioId": "uuid",
  "uploadUrl": "https://s3.amazonaws.com/...",
  "expiresIn": 900
}
```

### 4. Client Direct Upload

- Client uploads file directly to S3 using pre-signed URL
- No server involvement in file transfer

### 5. Confirm Upload

Client sends POST to `/api/v1/audio/confirm` with `audioId`:

- Server creates Audio record in database
- Queues processing job in BullMQ
- Returns processing status

## Edge Cases

### Large Files (>50MB)

- Increase pre-signed URL expiration to 30 minutes
- Consider multipart upload for files >100MB

### Network Failures

- Client retries upload with exponential backoff
- Pre-signed URL regeneration if expired

### Invalid Formats

- Return 400 Bad Request with specific error message
- Log unsupported format attempts for monitoring

### S3 Upload Failure

- Client receives error from S3 directly
- Server cleanup: delete orphaned database record if confirmation never arrives
- Implement TTL cleanup job for unconfirmed uploads (>24 hours)

## Success Criteria

- Audio file successfully stored in S3
- Database record created with correct metadata
- Processing job queued
- Client receives confirmation with audioId

## Monitoring

- Track upload success/failure rates
- Monitor pre-signed URL expiration issues
- Alert on S3 storage quota approaching limits
