import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateQuestionDto {
  @ApiProperty({ example: '가장 기억에 남는 여행지는?' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  text: string;
}

export class CreateAnswerDto {
  @ApiProperty({ example: '답변영역임 . 뭘봐' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  text: string;
}
