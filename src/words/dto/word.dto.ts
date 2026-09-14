import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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

  // 수정 시 null 을 보내면 사진 삭제, 생략하면 그대로 (IsOptional 은 null 도 통과시킨다)
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  photoUrl?: string | null;
}

export class UpdateWordDto extends PartialType(CreateWordDto) {}
