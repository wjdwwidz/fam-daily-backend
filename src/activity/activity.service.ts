import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Word } from '../entities/word.entity';
import { Media } from '../entities/media.entity';
import { MediaComment } from '../entities/media-comment.entity';
import { Question } from '../entities/question.entity';
import { Answer } from '../entities/answer.entity';
import { Membership } from '../entities/membership.entity';
import { BucketItem } from '../entities/bucket-item.entity';

export type ActivityType =
  | 'word'
  | 'media'
  | 'question'
  | 'answer'
  | 'comment'
  | 'bucket'
  | 'bucketDone';

export const DEFAULT_ACTIVITY_LIMIT = 5;
const MAX_ACTIVITY_LIMIT = 20;

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(Word) private readonly words: Repository<Word>,
    @InjectRepository(Media) private readonly media: Repository<Media>,
    @InjectRepository(Question) private readonly questions: Repository<Question>,
    @InjectRepository(Answer) private readonly answers: Repository<Answer>,
    @InjectRepository(MediaComment)
    private readonly comments: Repository<MediaComment>,
    @InjectRepository(Membership)
    private readonly memberships: Repository<Membership>,
    @InjectRepository(BucketItem)
    private readonly bucket: Repository<BucketItem>,
  ) {}

  // 가족의 최근 활동 — 사전 추가·일상 올림·질문·답변을 최신순으로 섞어서.
  //
  // 종류마다 최신 take 개만 가져와 합친 뒤 다시 take 개를 자른다.
  // 전체에서 최신 take 개는 반드시 각 종류의 최신 take 개 안에 있으므로 결과는 같다.
  async recent(userId: string, groupId: string, limit = DEFAULT_ACTIVITY_LIMIT) {
    await this.assertMember(userId, groupId);
    const take = Math.min(Math.max(1, limit), MAX_ACTIVITY_LIMIT);

    const [words, media, questions, answers, comments, bucket, bucketDone] =
      await Promise.all([
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
      // 일상 댓글 (내용을 지운 "삭제된 댓글"은 빼고)
      this.comments.find({
        where: { groupId, deletedAt: IsNull() },
        relations: { author: { user: true } },
        order: { createdAt: 'DESC' },
        take,
      }),
      // 버킷리스트에 새로 적은 칸
      this.bucket.find({
        where: { groupId },
        relations: { createdBy: { user: true } },
        order: { createdAt: 'DESC' },
        take,
      }),
      // 달성한 칸 — 누가 눌렀는지는 보여주지 않는다 (가족이 함께 이룬 일이므로)
      this.bucket.find({
        where: { groupId, doneAt: Not(IsNull()) },
        order: { doneAt: 'DESC' },
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
      // 댓글은 댓글 내용을 보여주고, 누르면 그 일상 글로 → targetId 는 글
      ...comments.map((c) => this.item('comment', c.id, c.mediaId, c.text, c.createdAt, c.author)),
      // 누르면 그 칸으로 → targetId 는 칸 번호
      ...bucket.map((b) =>
        this.item('bucket', b.id, String(b.no), b.text, b.createdAt, b.createdBy),
      ),
      // 달성은 작성자 없이 "n번을 달성했어요" 로만 보여준다
      ...bucketDone.map((b) =>
        this.item('bucketDone', `done-${b.id}`, String(b.no), b.text, b.doneAt!, null),
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
