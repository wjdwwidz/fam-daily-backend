import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Membership } from '../entities/membership.entity';
import { Post } from '../entities/post.entity';
import { PostComment } from '../entities/post-comment.entity';
import {
  CreatePostCommentDto,
  CreatePostDto,
  MAX_POST_COMMENT_LENGTH,
  MAX_POST_LENGTH,
  UpdatePostCommentDto,
  UpdatePostDto,
} from './dto/board.dto';

// 가족 게시판.
//  - 가족 구성원만 보고 쓴다
//  - 글·댓글은 쓴 사람만 고치고 지운다 (달력·버킷리스트와 달리 개인 글이라서)
//  - 댓글 규칙은 일상 글과 같다: 답글은 한 단계까지, 답글이 달린 댓글은 내용만 비운다
@Injectable()
export class BoardService {
  constructor(
    @InjectRepository(Post) private readonly posts: Repository<Post>,
    @InjectRepository(PostComment)
    private readonly comments: Repository<PostComment>,
    @InjectRepository(Membership)
    private readonly memberships: Repository<Membership>,
  ) {}

  // ── 글 ────────────────────────────────────────────────────────────
  // 목록은 최신순. 본문이 길 수 있어 댓글은 싣지 않고 개수만 센다.
  async list(userId: string, groupId: string, limit = 30) {
    await this.assertMember(userId, groupId);
    const rows = await this.posts.find({
      where: { groupId },
      relations: { author: { user: true } },
      order: { createdAt: 'DESC' },
      take: Math.min(Math.max(1, limit), 100),
    });
    const counts = await this.commentCounts(rows.map((p) => p.id));
    return rows.map((p) => ({
      ...this.postJson(p, userId),
      commentCount: counts.get(p.id) ?? 0,
    }));
  }

  async getOne(userId: string, postId: string) {
    const post = await this.mustPost(postId);
    await this.assertMember(userId, post.groupId);
    const { count, comments } = await this.listComments(userId, postId);
    return { ...this.postJson(post, userId), commentCount: count, comments };
  }

  async create(userId: string, groupId: string, dto: CreatePostDto) {
    const me = await this.assertMember(userId, groupId);
    const saved = await this.posts.save(
      this.posts.create({
        text: this.cleanText(dto.text, MAX_POST_LENGTH, '글'),
        groupId,
        authorId: me.id,
      }),
    );
    return this.getOne(userId, saved.id);
  }

  async update(userId: string, postId: string, dto: UpdatePostDto) {
    const post = await this.mustOwnPost(userId, postId);
    post.text = this.cleanText(dto.text, MAX_POST_LENGTH, '글');
    await this.posts.save(post);
    return this.getOne(userId, postId);
  }

  // 글을 지우면 댓글도 함께 사라진다 (DB 의 CASCADE)
  async remove(userId: string, postId: string) {
    const post = await this.mustOwnPost(userId, postId);
    await this.posts.remove(post);
    return { ok: true };
  }

  // ── 댓글 ──────────────────────────────────────────────────────────
  // 쓰기 요청은 모두 갱신된 목록을 돌려준다. 화면이 다시 부르지 않아도 되게.
  async listComments(userId: string, postId: string) {
    const post = await this.mustPost(postId);
    await this.assertMember(userId, post.groupId);
    const rows = await this.comments.find({
      where: { postId },
      relations: { author: { user: true } },
      order: { createdAt: 'ASC' },
    });

    const roots = rows
      .filter((c) => !c.parentId)
      .map((c) => ({
        ...this.commentJson(c, userId),
        replies: [] as ReturnType<BoardService['commentJson']>[],
      }));
    const byId = new Map(roots.map((r) => [r.id, r]));
    for (const c of rows) {
      if (c.parentId) byId.get(c.parentId)?.replies.push(this.commentJson(c, userId));
    }
    return {
      // 지워지지 않은 댓글·답글 수
      count: rows.filter((c) => !c.deletedAt).length,
      comments: roots,
    };
  }

  async addComment(userId: string, postId: string, dto: CreatePostCommentDto) {
    const post = await this.mustPost(postId);
    const me = await this.assertMember(userId, post.groupId);
    const text = this.cleanText(dto.text, MAX_POST_COMMENT_LENGTH, '댓글');

    let parentId: string | null = null;
    if (dto.parentId) {
      const parent = await this.comments.findOne({
        where: { id: dto.parentId, postId },
      });
      if (!parent) throw new NotFoundException('답글을 달 댓글을 찾을 수 없습니다.');
      // 답글에 답하면 같은 최상위 댓글 아래로 (한 단계까지만)
      parentId = parent.parentId ?? parent.id;
    }

    await this.comments.save(
      this.comments.create({
        text,
        postId,
        groupId: post.groupId,
        parentId,
        authorId: me.id,
      }),
    );
    return this.listComments(userId, postId);
  }

  async updateComment(
    userId: string,
    commentId: string,
    dto: UpdatePostCommentDto,
  ) {
    const comment = await this.mustOwnComment(userId, commentId);
    if (comment.deletedAt) {
      throw new BadRequestException('삭제된 댓글은 수정할 수 없습니다.');
    }
    comment.text = this.cleanText(dto.text, MAX_POST_COMMENT_LENGTH, '댓글');
    await this.comments.save(comment);
    return this.listComments(userId, comment.postId);
  }

  async removeComment(userId: string, commentId: string) {
    const comment = await this.mustOwnComment(userId, commentId);
    const { postId, parentId } = comment;

    const hasReplies =
      !parentId && (await this.comments.existsBy({ parentId: comment.id }));
    if (hasReplies) {
      // 답글이 남아 있으면 내용만 지운다 — 대화가 끊기지 않게
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
    return this.listComments(userId, postId);
  }

  // ── 안쪽 ──────────────────────────────────────────────────────────
  // 글마다 지워지지 않은 댓글 수 (목록에서 한 번에 센다)
  private async commentCounts(postIds: string[]) {
    if (!postIds.length) return new Map<string, number>();
    const rows = await this.comments
      .createQueryBuilder('c')
      .select('c.postId', 'postId')
      .addSelect('COUNT(*)', 'count')
      .where({ postId: In(postIds) })
      .andWhere('c.deletedAt IS NULL')
      .groupBy('c.postId')
      .getRawMany<{ postId: string; count: string }>();
    return new Map(rows.map((r) => [r.postId, Number(r.count)]));
  }

  private cleanText(raw: string, max: number, what: string) {
    const text = (raw ?? '').trim();
    if (!text) throw new BadRequestException(`${what} 내용을 입력해주세요.`);
    if (text.length > max) {
      throw new BadRequestException(`${what}은 ${max}자까지 쓸 수 있어요.`);
    }
    return text;
  }

  private async mustPost(postId: string) {
    const post = await this.posts.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('글을 찾을 수 없습니다.');
    return post;
  }

  private async mustOwnPost(userId: string, postId: string) {
    const post = await this.posts.findOne({
      where: { id: postId },
      relations: { author: { user: true } },
    });
    if (!post) throw new NotFoundException('글을 찾을 수 없습니다.');
    await this.assertMember(userId, post.groupId);
    if (post.author?.user?.id !== userId) {
      throw new ForbiddenException('내가 쓴 글만 고치고 지울 수 있습니다.');
    }
    return post;
  }

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

  private postJson(p: Post, userId: string) {
    return {
      id: p.id,
      text: p.text,
      createdAt: p.createdAt,
      // 저장 직후의 미세한 차이는 수정으로 보지 않는다
      edited: p.updatedAt.getTime() - p.createdAt.getTime() > 1000,
      mine: p.author?.user?.id === userId,
      author: this.authorJson(p.author),
    };
  }

  private commentJson(c: PostComment, userId: string) {
    const deleted = !!c.deletedAt;
    return {
      id: c.id,
      parentId: c.parentId,
      deleted,
      text: deleted ? '' : c.text,
      createdAt: c.createdAt,
      edited: !deleted && c.updatedAt.getTime() - c.createdAt.getTime() > 1000,
      mine: !deleted && c.author?.user?.id === userId,
      author: deleted ? null : this.authorJson(c.author),
    };
  }

  private authorJson(m: Membership | null) {
    if (!m) return null;
    return {
      userId: m.user?.id ?? null,
      nickname: m.nickname,
      name: m.user?.name ?? '',
      // 이 가족에서 쓰는 사진 (없으면 이니셜)
      photoUrl: m.photoUrl ?? null,
    };
  }
}
