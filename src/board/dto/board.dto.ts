import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

// 글은 길게, 댓글은 짧게 (일상 댓글과 같은 한도)
export const MAX_POST_LENGTH = 2000;
export const MAX_POST_COMMENT_LENGTH = 300;

export class CreatePostDto {
  @ApiProperty({ example: '이번 주말에 다 같이 모일 수 있을까?' })
  @IsString()
  @MaxLength(MAX_POST_LENGTH)
  text: string;
}

export class UpdatePostDto {
  @ApiProperty({ example: '이번 주말 말고 다음 주 어때?' })
  @IsString()
  @MaxLength(MAX_POST_LENGTH)
  text: string;
}

export class CreatePostCommentDto {
  @ApiProperty({ example: '나는 토요일 좋아' })
  @IsString()
  @MaxLength(MAX_POST_COMMENT_LENGTH)
  text: string;

  @ApiPropertyOptional({
    description: '답글이면 답할 댓글의 id (답글에 답해도 한 단계까지만)',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}

export class UpdatePostCommentDto {
  @ApiProperty({ example: '나는 일요일이 나을 것 같아' })
  @IsString()
  @MaxLength(MAX_POST_COMMENT_LENGTH)
  text: string;
}
