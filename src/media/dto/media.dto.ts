import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

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

  @ApiPropertyOptional({ example: '오늘 저녁 산책' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  caption?: string;
}
