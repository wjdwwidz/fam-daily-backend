import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { extname } from 'path';

// 파일 저장소 추상화 — 지금은 Supabase Storage. 나중에 R2/S3로 갈아끼우기 쉽게 한 곳에 모음.
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: SupabaseClient | null;
  private readonly bucket: string;

  constructor(config: ConfigService) {
    const url = config.get<string>('SUPABASE_URL');
    const key = config.get<string>('SUPABASE_SERVICE_KEY');
    this.bucket = config.get<string>('SUPABASE_BUCKET') || 'photos';
    this.client = url && key ? createClient(url, key) : null;
    if (!this.client) {
      this.logger.warn(
        'SUPABASE_URL/SUPABASE_SERVICE_KEY 미설정 → 업로드 비활성 (설정하면 활성화)',
      );
    }
  }

  // 파일 업로드 후 public URL 반환
  async upload(file: Express.Multer.File): Promise<string> {
    if (!this.client) {
      throw new InternalServerErrorException(
        '스토리지가 설정되지 않았습니다 (SUPABASE_URL/SUPABASE_SERVICE_KEY 필요).',
      );
    }
    const ext = extname(file.originalname || '') || '.jpg';
    const path = `${Date.now()}-${randomBytes(6).toString('hex')}${ext}`;

    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });
    if (error) {
      this.logger.error(`Supabase 업로드 실패: ${error.message}`);
      throw new InternalServerErrorException('파일 업로드에 실패했습니다.');
    }

    const { data } = this.client.storage.from(this.bucket).getPublicUrl(path);
    return data.publicUrl;
  }
}
