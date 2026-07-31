import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength, MaxLength } from 'class-validator';

export class UpdateMeDto {
  @ApiProperty({ example: '김서연', minLength: 1, maxLength: 30 })
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  name: string;

  @ApiPropertyOptional({ example: 'https://xxx.supabase.co/.../profiles/abc.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoUrl?: string;
}
