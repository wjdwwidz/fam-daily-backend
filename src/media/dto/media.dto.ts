import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

// 'YYYY-MM-DD' — 시각 없는 날짜만 받는다 (시각이 붙으면 시간대에 따라 하루가 밀린다)
const YMD = /^\d{4}-\d{2}-\d{2}$/;
const YMD_MSG = '날짜는 YYYY-MM-DD 형식이어야 합니다.';

export class PrepareFileDto {
  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  @MaxLength(100)
  contentType: string;

  @ApiPropertyOptional({ example: 1048576, description: '바이트. 용량 확인용' })
  @IsOptional()
  @IsInt()
  @Min(0)
  size?: number;

  @ApiPropertyOptional({ example: 'IMG_0001.HEIC' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  fileName?: string;
}

export class PrepareUploadDto {
  @ApiProperty({ type: [PrepareFileDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => PrepareFileDto)
  files: PrepareFileDto[];
}

export class CommitUploadDto {
  @ApiProperty({ type: [String], description: 'prepare 가 돌려준 uploadId 들' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  uploadIds: string[];

  @ApiPropertyOptional({ example: '오늘 저녁 산책' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  caption?: string;

  @ApiPropertyOptional({
    example: '2026-09-20',
    description: '언제의 일인지 (시작일). 하루면 이것만',
  })
  @IsOptional()
  @Matches(YMD, { message: YMD_MSG })
  takenFrom?: string;

  @ApiPropertyOptional({
    example: '2026-09-22',
    description: '며칠 동안이면 끝나는 날',
  })
  @IsOptional()
  @Matches(YMD, { message: YMD_MSG })
  takenTo?: string;
}

export class UpdateMediaDto {
  @ApiPropertyOptional({
    type: [String],
    description: '보내면 사진·영상이 통째로 교체된다. 생략하면 글만 바뀐다.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  uploadIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    description:
      '남길 기존 사진의 url. 보내면 여기 없는 기존 사진은 지워진다. ' +
      'uploadIds 와 함께 보내면 남긴 사진 뒤에 새 사진이 붙는다.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  keepUrls?: string[];

  @ApiPropertyOptional({ example: '오늘 저녁 산책' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  caption?: string;

  @ApiPropertyOptional({
    example: '2026-09-20',
    nullable: true,
    description: '보내면 바뀐다. null 이면 날짜를 뺀다. 생략하면 그대로.',
  })
  @IsOptional()
  @Matches(YMD, { message: YMD_MSG })
  takenFrom?: string | null;

  @ApiPropertyOptional({ example: '2026-09-22', nullable: true })
  @IsOptional()
  @Matches(YMD, { message: YMD_MSG })
  takenTo?: string | null;
}
