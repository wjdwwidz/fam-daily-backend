import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Word } from '../entities/word.entity';
import { Media } from '../entities/media.entity';
import { Question } from '../entities/question.entity';
import { Answer } from '../entities/answer.entity';
import { Membership } from '../entities/membership.entity';

export type ActivityType = 'word' | 'media' | 'question' | 'answer';

export const DEFAULT_ACTIVITY_LIMIT = 5;
const MAX_ACTIVITY_LIMIT = 20;

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(Word) private readonly words: Repository<Word>,
    @InjectRepository(Media) private readonly media: Repository<Media>,
    @InjectRepository(Question) private readonly questions: Repository<Question>,
    @InjectRepository(Answer) private readonly answers: Repository<Answer>,
    @InjectRepository(Membership)
    private readonly memberships: Repository<Membership>,
  ) {}

  // 가족의 최근 활동 — 사전 추가·일상 올림·질문·답변을 최신순으로 섞어서.
  //
  // 종류마다 최신 take 개만 가져와 합친 뒤 다시 take 개를 자른다.
  // 전체에서 최신 take 개는 반드시 각 종류의 최신 take 개 안에 있으므로 결과는 같다.
  async recent(userId: string, groupId: string, limit = DEFAULT_ACTIVITY_LIMIT) {
    await this.assertMember(userId, groupId);
    const take = Math.min(Math.max(1, limit), MAX_ACTIVITY_LIMIT);

    const [words, media, questions, answers] = await Promise.all([
      this.words.find({
        where: { groupId },
        relations: { author: { user: true } },
        order: { createdAt: 'DESC' },
        take,
      }),
      this.media.find({
        where: { groupId },
        relations: { author: { user: true } },
        order: { createdAt: 'DESC' },
        take,
      }),
      this.questions.find({
        where: { groupId },
        relations: { author: { user: true } },
        order: { createdAt: 'DESC' },
        take,
      }),
      // 답변은 질문을 거쳐 가족에 연결된다
      this.answers.find({
        where: { question: { groupId } },
        relations: { author: { user: true }, question: true },
        order: { createdAt: 'DESC' },
        take,
      }),
    ]);

    const items = [
      ...words.map((w) => this.item('word', w.id, w.id, w.term, w.createdAt, w.author)),
      ...media.map((m) =>
        this.item('media', m.id, m.id, m.caption, m.createdAt, m.author, m.items?.[0]?.url ?? m.photoUrl),
      ),
      ...questions.map((q) => this.item('question', q.id, q.id, q.text, q.createdAt, q.author)),
      // 답변은 '어느 질문에 답했는지'를 보여준다 → text 는 질문 내용, targetId 는 질문
      ...answers.map((a) =>
        this.item('answer', a.id, a.questionId, a.question?.text ?? '', a.createdAt, a.author),
      ),
    ];
    return items
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, take);
  }

  private item(
    type: ActivityType,
    id: string,
    targetId: string,
    text: string,
    createdAt: Date,
    author: Membership | null,
    coverUrl: string | null = null,
  ) {
    return {
      type,
      id,
      // 눌렀을 때 열 대상 (단어·일상 글·질문)
      targetId,
      text,
      coverUrl,
      createdAt,
      author: author
        ? {
            userId: author.user?.id ?? null,
            nickname: author.nickname,
            name: author.user?.name ?? '',
            // 이 가족에서 쓰는 사진 (없으면 이니셜)
            photoUrl: author.photoUrl ?? null,
          }
        : null,
    };
  }

  private async assertMember(userId: string, groupId: string) {
    const m = await this.memberships.findOne({
      where: { user: { id: userId }, group: { id: groupId } },
    });
    if (!m) throw new ForbiddenException('이 그룹의 구성원이 아닙니다.');
    return m;
  }
}
