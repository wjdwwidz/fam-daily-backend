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
import { WordsService } from './words.service';
import { CreateWordDto, UpdateWordDto } from './dto/word.dto';

@ApiTags('words')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard)
export class WordsController {
  constructor(private readonly words: WordsService) {}

  @Get('groups/:groupId/words')
  @ApiOperation({ summary: '그룹의 단어 목록' })
  list(@CurrentUser() user: AuthUser, @Param('groupId') groupId: string) {
    return this.words.list(user.id, groupId);
  }

  @Post('groups/:groupId/words')
  @ApiOperation({ summary: '단어 추가' })
  create(
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
    @Body() dto: CreateWordDto,
  ) {
    return this.words.create(user.id, groupId, dto);
  }

  @Patch('words/:wordId')
  @ApiOperation({ summary: '단어 수정' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('wordId') wordId: string,
    @Body() dto: UpdateWordDto,
  ) {
    return this.words.update(user.id, wordId, dto);
  }

  @Delete('words/:wordId')
  @ApiOperation({ summary: '단어 삭제' })
  remove(@CurrentUser() user: AuthUser, @Param('wordId') wordId: string) {
    return this.words.remove(user.id, wordId);
  }
}
