import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Media } from '../entities/media.entity';
import { MediaComment } from '../entities/media-comment.entity';
import { Membership } from '../entities/membership.entity';
import {
  CreateCommentDto,
  MAX_COMMENT_LENGTH,
  UpdateCommentDto,
} from './dto/comment.dto';

// 일상 글 댓글.
//  - 가족 구성원만 보고 쓴다
//  - 답글은 한 단계까지 (답글에 답하면 같은 최상위 댓글 아래에 붙는다)
//  - 수정·삭제는 쓴 사람만
//  - 답글이 달린 댓글을 지우면 내용만 비워 "삭제된 댓글"로 남긴다 — 답글 대화가 끊기지 않게
//
// 쓰기 요청은 모두 갱신된 댓글 목록을 돌려준다. 화면이 다시 부르지 않아도 되게.
@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(MediaComment)
    private readonly comments: Repository<MediaComment>,
    @InjectRepository(Media) private readonly media: Repository<Media>,
    @InjectRepository(Membership)
    private readonly memberships: Repository<Membership>,
  ) {}

  async list(userId: string, mediaId: string) {
    const media = await this.mustMedia(mediaId);
    await this.assertMember(userId, media.groupId);
    const rows = await this.comments.find({
      where: { mediaId },
      relations: { author: { user: true } },
      order: { createdAt: 'ASC' },
    });

    const roots = rows
      .filter((c) => !c.parentId)
      .map((c) => ({ ...this.json(c, userId), replies: [] as ReturnType<CommentsService['json']>[] }));
    const byId = new Map(roots.map((r) => [r.id, r]));
    for (const c of rows) {
      if (c.parentId) byId.get(c.parentId)?.replies.push(this.json(c, userId));
    }
    return {
      // 지워지지 않은 댓글·답글 수
      count: rows.filter((c) => !c.deletedAt).length,
      comments: roots,
    };
  }

  async create(userId: string, mediaId: string, dto: CreateCommentDto) {
    const media = await this.mustMedia(mediaId);
    const membership = await this.assertMember(userId, media.groupId);
    const text = this.cleanText(dto.text);

    let parentId: string | null = null;
    if (dto.parentId) {
      const parent = await this.comments.findOne({ where: { id: dto.parentId, mediaId } });
      if (!parent) throw new NotFoundException('답글을 달 댓글을 찾을 수 없습니다.');
      // 답글에 답하면 같은 최상위 댓글 아래로 (한 단계까지만)
      parentId = parent.parentId ?? parent.id;
    }

    await this.comments.save(
      this.comments.create({
        text,
        mediaId,
        groupId: media.groupId,
        parentId,
        authorId: membership.id,
      }),
    );
    return this.list(userId, mediaId);
  }

  async update(userId: string, commentId: string, dto: UpdateCommentDto) {
    const comment = await this.mustOwnComment(userId, commentId);
    if (comment.deletedAt) throw new BadRequestException('삭제된 댓글은 수정할 수 없습니다.');
    comment.text = this.cleanText(dto.text);
    await this.comments.save(comment);
    return this.list(userId, comment.mediaId);
  }

  async remove(userId: string, commentId: string) {
    const comment = await this.mustOwnComment(userId, commentId);
    const { mediaId, parentId } = comment;

    const hasReplies = !parentId && (await this.comments.existsBy({ parentId: comment.id }));
    if (hasReplies) {
      // 답글이 남아 있으면 내용만 지운다
      comment.text = '';
      comment.deletedAt = new Date();
      await this.comments.save(comment);
    } else {
      await this.comments.remove(comment);
      // 마지막 답글이 지워졌고 부모가 이미 "삭제된 댓글"이면 부모도 정리
      if (parentId) {
        const parent = await this.comments.findOne({ where: { id: parentId } });
        if (parent?.deletedAt && !(await this.comments.existsBy({ parentId }))) {
          await this.comments.remove(parent);
        }
      }
    }
    return this.list(userId, mediaId);
  }

  private cleanText(raw: string) {
    const text = (raw ?? '').trim();
    if (!text) throw new BadRequestException('댓글 내용을 입력해주세요.');
    if (text.length > MAX_COMMENT_LENGTH) {
      throw new BadRequestException(`댓글은 ${MAX_COMMENT_LENGTH}자까지 쓸 수 있어요.`);
    }
    return text;
  }

  private async mustMedia(mediaId: string) {
    const media = await this.media.findOne({ where: { id: mediaId }, select: { id: true, groupId: true } });
    if (!media) throw new NotFoundException('일상 글을 찾을 수 없습니다.');
    return media;
  }

  // 쓴 사람만 수정·삭제한다. 가족에서 나간 구성원이라면(=구성원이 아니면) 거절된다.
  private async mustOwnComment(userId: string, commentId: string) {
    const comment = await this.comments.findOne({
      where: { id: commentId },
      relations: { author: { user: true } },
    });
    if (!comment) throw new NotFoundException('댓글을 찾을 수 없습니다.');
    await this.assertMember(userId, comment.groupId);
    if (comment.author?.user?.id !== userId) {
      throw new ForbiddenException('내가 쓴 댓글만 수정·삭제할 수 있습니다.');
    }
    return comment;
  }

  private async assertMember(userId: string, groupId: string) {
    const m = await this.memberships.findOne({
      where: { user: { id: userId }, group: { id: groupId } },
    });
    if (!m) throw new ForbiddenException('이 그룹의 구성원이 아닙니다.');
    return m;
  }

  private json(c: MediaComment, userId: string) {
    const deleted = !!c.deletedAt;
    return {
      id: c.id,
      parentId: c.parentId,
      deleted,
      text: deleted ? '' : c.text,
      createdAt: c.createdAt,
      // 저장 직후의 미세한 차이는 수정으로 보지 않는다
      edited: !deleted && c.updatedAt.getTime() - c.createdAt.getTime() > 1000,
      mine: !deleted && c.author?.user?.id === userId,
      author:
        deleted || !c.author
          ? null
          : {
              userId: c.author.user?.id ?? null,
              nickname: c.author.nickname,
              name: c.author.user?.name ?? '',
              // 이 가족에서 쓰는 사진 (없으면 이니셜)
              photoUrl: c.author.photoUrl ?? null,
            },
    };
  }
}
