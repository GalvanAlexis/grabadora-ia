import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateAudioDto {
  /*
   * For file uploads, the file itself is validated by Multer,
   * but we can validate body fields if any.
   * Currently the app sends 'userId' optionally, though the logic might not use it yet.
   */

  @IsOptional()
  @IsString()
  userId?: string;

  // Add other metadata fields here if the mobile app starts sending them
  // (e.g., duration, deviceId, etc.)
}
