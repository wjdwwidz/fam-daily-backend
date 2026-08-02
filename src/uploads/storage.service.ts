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

  // 파일 업로드 후 public URL 반환. folder 로 버킷 내 경로(prefix) 정리 (예: 'words')
  async upload(file: Express.Multer.File, folder?: string): Promise<string> {
    if (!this.client) {
      throw new InternalServerErrorException(
        '스토리지가 설정되지 않았습니다 (SUPABASE_URL/SUPABASE_SERVICE_KEY 필요).',
      );
    }
    // 경로 주입 방지: 영문/숫자/_/-/ 만 허용, 앞뒤 슬래시 제거
    const safeFolder = (folder || '')
      .replace(/[^a-zA-Z0-9/_-]/g, '')
      .replace(/^\/+|\/+$/g, '');
    const ext = extname(file.originalname || '') || '.jpg';
    const file_name = `${Date.now()}-${randomBytes(6).toString('hex')}${ext}`;
    const path = safeFolder ? `${safeFolder}/${file_name}` : file_name;

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

  // public URL 에서 이 버킷의 파일 경로를 뽑아 삭제. 우리 버킷 파일이 아니면 무시.
  // (프로필/사전 사진 교체 시 예전 파일이 orphan 으로 쌓이지 않도록)
  async removeByUrl(publicUrl?: string | null): Promise<void> {
    if (!this.client || !publicUrl) return;
    const marker = `/object/public/${this.bucket}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return; // 우리 버킷 URL 이 아니면 건드리지 않음
    const path = decodeURIComponent(
      publicUrl.slice(idx + marker.length).split('?')[0],
    );
    if (!path) return;
    const { error } = await this.client.storage.from(this.bucket).remove([path]);
    if (error) {
      // 삭제 실패는 치명적이지 않음 (본 요청은 이미 성공) → 경고만
      this.logger.warn(`이전 파일 삭제 실패(무시): ${error.message}`);
    }
  }
}
