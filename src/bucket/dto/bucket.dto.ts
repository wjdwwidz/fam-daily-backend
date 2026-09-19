import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  Min,
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

  @ApiPropertyOptional({
    description:
      '이룬 날. 체크한 순간이 아니라 실제로 이룬 날을 고를 수 있다. 생략하면 지금.',
    example: '2026-09-15',
  })
  @IsOptional()
  @IsDateString()
  doneAt?: string;

  @ApiPropertyOptional({ description: '이어붙일 일상 글 id. null 이면 연결 해제' })
  @IsOptional()
  @IsUUID()
  mediaId?: string | null;
}

// 칸을 다른 번호로 옮긴다 (우선순위 조정). 사이 칸들은 한 칸씩 밀린다.
export class MoveBucketDto {
  @ApiProperty({ example: 2, description: '옮길 번호' })
  @IsInt()
  @Min(1)
  to: number;
}
