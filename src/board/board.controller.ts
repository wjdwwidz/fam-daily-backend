import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post as HttpPost,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { BoardService } from './board.service';
import {
  CreatePostCommentDto,
  CreatePostDto,
  UpdatePostCommentDto,
  PinPostDto,
  UpdatePostDto,
} from './dto/board.dto';

// 댓글 주소가 일상 댓글(/comments/:id)과 겹치지 않게 /post-comments 로 둔다.
@ApiTags('board')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard)
export class BoardController {
  constructor(private readonly board: BoardService) {}

  @Get('groups/:groupId/posts')
  @ApiOperation({ summary: '가족 게시판 글 목록 (최신순)' })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: '앞 쪽 응답의 nextCursor — 그보다 오래된 글부터 준다',
  })
  list(
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const n = Number(limit);
    return this.board.list(
      user.id,
      groupId,
      Number.isFinite(n) && n > 0 ? Math.floor(n) : 20,
      cursor,
    );
  }

  @HttpPost('groups/:groupId/posts')
  @ApiOperation({ summary: '글 쓰기' })
  create(
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
    @Body() dto: CreatePostDto,
  ) {
    return this.board.create(user.id, groupId, dto);
  }

  @Patch('posts/:postId/pin')
  @ApiOperation({ summary: '공지로 올리기·내리기 (가족 누구나, 3개까지)' })
  setPinned(
    @CurrentUser() user: AuthUser,
    @Param('postId') postId: string,
    @Body() dto: PinPostDto,
  ) {
    return this.board.setPinned(user.id, postId, dto.pinned);
  }

  @Get('posts/:postId')
  @ApiOperation({ summary: '글 하나 (댓글까지)' })
  getOne(@CurrentUser() user: AuthUser, @Param('postId') postId: string) {
    return this.board.getOne(user.id, postId);
  }

  @Patch('posts/:postId')
  @ApiOperation({ summary: '글 고치기 (쓴 사람만)' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('postId') postId: string,
    @Body() dto: UpdatePostDto,
  ) {
    return this.board.update(user.id, postId, dto);
  }

  @Delete('posts/:postId')
  @ApiOperation({ summary: '글 지우기 (쓴 사람만, 댓글도 함께)' })
  remove(@CurrentUser() user: AuthUser, @Param('postId') postId: string) {
    return this.board.remove(user.id, postId);
  }

  @Get('posts/:postId/comments')
  @ApiOperation({ summary: '글의 댓글 목록' })
  listComments(@CurrentUser() user: AuthUser, @Param('postId') postId: string) {
    return this.board.listComments(user.id, postId);
  }

  @HttpPost('posts/:postId/comments')
  @ApiOperation({ summary: '댓글·답글 달기' })
  addComment(
    @CurrentUser() user: AuthUser,
    @Param('postId') postId: string,
    @Body() dto: CreatePostCommentDto,
  ) {
    return this.board.addComment(user.id, postId, dto);
  }

  @Patch('post-comments/:commentId')
  @ApiOperation({ summary: '댓글 고치기 (쓴 사람만)' })
  updateComment(
    @CurrentUser() user: AuthUser,
    @Param('commentId') commentId: string,
    @Body() dto: UpdatePostCommentDto,
  ) {
    return this.board.updateComment(user.id, commentId, dto);
  }

  @Delete('post-comments/:commentId')
  @ApiOperation({ summary: '댓글 지우기 (쓴 사람만)' })
  removeComment(
    @CurrentUser() user: AuthUser,
    @Param('commentId') commentId: string,
  ) {
    return this.board.removeComment(user.id, commentId);
  }
}
