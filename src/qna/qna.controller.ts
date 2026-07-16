import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { QnaService } from './qna.service';
import { CreateAnswerDto, CreateQuestionDto } from './dto/qna.dto';

@ApiTags('qna')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard)
export class QnaController {
  constructor(private readonly qna: QnaService) {}

  @Get('groups/:groupId/questions')
  @ApiOperation({ summary: '그룹의 문답 질문 목록 (최신순)' })
  list(@CurrentUser() user: AuthUser, @Param('groupId') groupId: string) {
    return this.qna.listQuestions(user.id, groupId);
  }

  @Get('groups/:groupId/questions/current')
  @ApiOperation({ summary: '오늘의 질문 (가장 최근 질문 + 답변)' })
  current(@CurrentUser() user: AuthUser, @Param('groupId') groupId: string) {
    return this.qna.current(user.id, groupId);
  }

  @Post('groups/:groupId/questions')
  @ApiOperation({ summary: '질문 추가' })
  create(
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
    @Body() dto: CreateQuestionDto,
  ) {
    return this.qna.createQuestion(user.id, groupId, dto);
  }

  @Get('questions/:questionId')
  @ApiOperation({ summary: '질문 상세 (답변 포함)' })
  getOne(
    @CurrentUser() user: AuthUser,
    @Param('questionId') questionId: string,
  ) {
    return this.qna.getQuestion(user.id, questionId);
  }

  @Post('questions/:questionId/answers')
  @ApiOperation({ summary: '내 답변 남기기 (멤버당 하나, 다시 쓰면 수정)' })
  answer(
    @CurrentUser() user: AuthUser,
    @Param('questionId') questionId: string,
    @Body() dto: CreateAnswerDto,
  ) {
    return this.qna.answer(user.id, questionId, dto);
  }
}
