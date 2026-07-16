import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateQuestionDto {
  @ApiProperty({ example: '우리 가족 하면 가장 먼저 떠오르는 냄새는?' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  text: string;
}

export class CreateAnswerDto {
  @ApiProperty({ example: '갓 지은 쌀밥 냄새 🍚' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  text: string;
}
