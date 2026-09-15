import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export const MAX_COMMENT_LENGTH = 300;

export class CreateCommentDto {
  @ApiProperty({ example: '너무 귀엽다 ㅎㅎ' })
  @IsString()
  @MaxLength(MAX_COMMENT_LENGTH)
  text: string;

  @ApiPropertyOptional({ description: '답글이면 답할 댓글 ID. 답글에 답하면 같은 최상위 댓글 아래에 붙는다.' })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}

export class UpdateCommentDto {
  @ApiProperty({ example: '너무 귀엽다!!' })
  @IsString()
  @MaxLength(MAX_COMMENT_LENGTH)
  text: string;
}
