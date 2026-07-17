import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class UpdateMeDto {
  @ApiProperty({ example: '김서연', minLength: 1, maxLength: 30 })
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  name: string;
}
