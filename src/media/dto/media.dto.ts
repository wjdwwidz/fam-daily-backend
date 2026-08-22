import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateMediaDto {
  @ApiProperty({ example: 'https://xxx.supabase.co/.../media/abc.jpg' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  photoUrl: string;

  @ApiPropertyOptional({ example: '오늘 저녁 산책' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  caption?: string;
}
