import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export const MAX_WORD_PHOTOS = 10;

export class CreateWordDto {
  @ApiProperty({ example: '응아' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  term: string;

  @ApiPropertyOptional({ example: '응아응아' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  reading?: string;

  @ApiProperty({ example: '화장실 가고 싶다는 신호' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  meaning: string;

  @ApiPropertyOptional({ example: '"엄마 응아!" 하면 화장실로 직행해요' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  example?: string;

  @ApiPropertyOptional({
    type: [String],
    description: `사진 주소 목록 (최대 ${MAX_WORD_PHOTOS}장). 보내면 통째로 교체, 생략하면 그대로`,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_WORD_PHOTOS)
  @IsString({ each: true })
  @MaxLength(1000, { each: true })
  photoUrls?: string[];

  // 예전 앱용 (한 장). photoUrls 가 없을 때만 본다.
  // null 이면 사진 전부 삭제, 생략하면 그대로 (IsOptional 은 null 도 통과시킨다)
  @ApiPropertyOptional({ nullable: true, deprecated: true })
  @IsOptional()
  @IsString()
  photoUrl?: string | null;
}

export class UpdateWordDto extends PartialType(CreateWordDto) {}
