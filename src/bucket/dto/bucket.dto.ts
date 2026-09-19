import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

// 버킷리스트 한 칸 쓰기. 번호는 경로(:no)로 받는다.
export class SaveBucketDto {
  @ApiProperty({ example: '제주도에서 가족사진 찍기', maxLength: 30 })
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  text: string;

  @ApiPropertyOptional({ description: '가족 공동 달성 여부' })
  @IsOptional()
  @IsBoolean()
  done?: boolean;

  @ApiPropertyOptional({ description: '이어붙일 일상 글 id. null 이면 연결 해제' })
  @IsOptional()
  @IsUUID()
  mediaId?: string | null;
}
