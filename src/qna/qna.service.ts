import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question } from '../entities/question.entity';
import { Answer } from '../entities/answer.entity';
import { Membership } from '../entities/membership.entity';
import { CreateAnswerDto, CreateQuestionDto } from './dto/qna.dto';

@Injectable()
export class QnaService {
  constructor(
    @InjectRepository(Question)
    private readonly questions: Repository<Question>,
    @InjectRepository(Answer) private readonly answers: Repository<Answer>,
    @InjectRepository(Membership)
    private readonly memberships: Repository<Membership>,
  ) {}

  // 그룹의 질문 목록 (최신순). 각 질문에 답변 수/답변한 멤버 미리보기 포함.
  async listQuestions(userId: string, groupId: string) {
    await this.assertMember(userId, groupId);
    const [ordered, memberCount] = await Promise.all([
      this.orderedWithAnswers(groupId),
      this.memberCount(groupId),
    ]);
    const total = ordered.length;
    const questions = ordered
      .map((q, i) => this.summary(q, i + 1, total))
      .reverse(); // 최신순
    return { memberCount, total, questions };
  }

  // 오늘의 질문 = 가장 최근 질문 (+ 전체 답변)
  async current(userId: string, groupId: string) {
    await this.assertMember(userId, groupId);
    const [ordered, memberCount] = await Promise.all([
      this.orderedWithAnswers(groupId),
      this.memberCount(groupId),
    ]);
    const total = ordered.length;
    if (!total) {
      return { memberCount, total: 0, no: 0, question: null, answers: [] };
    }
    return this.detail(ordered[total - 1], total, total, memberCount);
  }

  async createQuestion(userId: string, groupId: string, dto: CreateQuestionDto) {
    const m = await this.assertMember(userId, groupId);
    const q = await this.questions.save(
      this.questions.create({ text: dto.text, groupId, authorId: m.id }),
    );
    return this.getQuestion(userId, q.id);
  }

  // 질문 상세 (no/total 포함)
  async getQuestion(userId: string, questionId: string) {
    const q = await this.questions.findOne({
      where: { id: questionId },
      relations: { answers: { author: { user: true } } },
    });
    if (!q) throw new NotFoundException('질문을 찾을 수 없습니다.');
    await this.assertMember(userId, q.groupId);
    const ids = await this.questions.find({
      where: { groupId: q.groupId },
      order: { createdAt: 'ASC', id: 'ASC' },
      select: { id: true },
    });
    const total = ids.length;
    const no = ids.findIndex((x) => x.id === q.id) + 1;
    return this.detail(q, no, total, await this.memberCount(q.groupId));
  }

  // 내 답변 남기기 (있으면 수정 = 멤버당 하나)
  async answer(userId: string, questionId: string, dto: CreateAnswerDto) {
    const q = await this.questions.findOne({ where: { id: questionId } });
    if (!q) throw new NotFoundException('질문을 찾을 수 없습니다.');
    const m = await this.assertMember(userId, q.groupId);
    // 댓글처럼 매번 새 답변으로 추가 (덮어쓰지 않음)
    await this.answers.save(
      this.answers.create({ text: dto.text, questionId, authorId: m.id }),
    );
    return this.getQuestion(userId, questionId);
  }

  // --- helpers ---

  private orderedWithAnswers(groupId: string) {
    return this.questions.find({
      where: { groupId },
      relations: { answers: { author: { user: true } } },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
  }

  private memberCount(groupId: string) {
    return this.memberships.count({ where: { group: { id: groupId } } });
  }

  private async assertMember(userId: string, groupId: string) {
    const m = await this.memberships.findOne({
      where: { user: { id: userId }, group: { id: groupId } },
    });
    if (!m) throw new ForbiddenException('이 그룹의 구성원이 아닙니다.');
    return m;
  }

  private authorJson(m: Membership | null) {
    return m ? { nickname: m.nickname, name: m.user?.name ?? '' } : null;
  }

  private answerJson(a: Answer) {
    return {
      id: a.id,
      text: a.text,
      createdAt: a.createdAt,
      author: this.authorJson(a.author),
    };
  }

  private summary(q: Question, no: number, total: number) {
    const answers = q.answers ?? [];
    return {
      id: q.id,
      no,
      total,
      text: q.text,
      createdAt: q.createdAt,
      answerCount: answers.length,
      answerers: answers.map((a) => this.authorJson(a.author)),
    };
  }

  private detail(
    q: Question,
    no: number,
    total: number,
    memberCount: number,
  ) {
    const answers = [...(q.answers ?? [])].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
    return {
      memberCount,
      no,
      total,
      question: { id: q.id, text: q.text, createdAt: q.createdAt },
      answers: answers.map((a) => this.answerJson(a)),
    };
  }
}
