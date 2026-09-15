import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { CommentsService } from './comments.service';
import { CreateCommentDto, UpdateCommentDto } from './dto/comment.dto';

@ApiTags('comments')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get('media/:mediaId/comments')
  @ApiOperation({ summary: '일상 글 댓글 목록 (답글은 댓글 아래에 묶임)' })
  list(@CurrentUser() user: AuthUser, @Param('mediaId') mediaId: string) {
    return this.comments.list(user.id, mediaId);
  }

  @Post('media/:mediaId/comments')
  @ApiOperation({ summary: '댓글·답글 쓰기 → 갱신된 댓글 목록' })
  create(
    @CurrentUser() user: AuthUser,
    @Param('mediaId') mediaId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.comments.create(user.id, mediaId, dto);
  }

  @Patch('comments/:commentId')
  @ApiOperation({ summary: '댓글 수정 (쓴 사람만) → 갱신된 댓글 목록' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('commentId') commentId: string,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.comments.update(user.id, commentId, dto);
  }

  @Delete('comments/:commentId')
  @ApiOperation({ summary: '댓글 삭제 (쓴 사람만) → 갱신된 댓글 목록' })
  remove(@CurrentUser() user: AuthUser, @Param('commentId') commentId: string) {
    return this.comments.remove(user.id, commentId);
  }
}
