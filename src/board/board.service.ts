import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { Membership } from '../entities/membership.entity';
import { Post } from '../entities/post.entity';
import { PostComment } from '../entities/post-comment.entity';
import {
  CreatePostCommentDto,
  CreatePostDto,
  MAX_POST_COMMENT_LENGTH,
  MAX_PINNED_POSTS,
  MAX_POST_LENGTH,
  MAX_POST_TITLE_LENGTH,
  UpdatePostCommentDto,
  UpdatePostDto,
} from './dto/board.dto';
import { extractUrls, LinkPreviewService } from '../links/link-preview.service';

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
    private readonly linkPreviews: LinkPreviewService,
  ) {}

  // ── 글 ────────────────────────────────────────────────────────────
  // 목록은 최신순으로 한 쪽씩 (끝까지 내리면 다음 쪽). 본문이 길 수 있어
  // 댓글은 싣지 않고 개수만 센다.
  //  - 공지는 맨 위에 따로 모아 첫 쪽에만 싣는다 (아래로 내릴 때 또 나오지 않게)
  //  - cursor 는 '여기보다 오래된 글부터' 라는 뜻의 쓴 시각
  async list(userId: string, groupId: string, limit = 20, cursor?: string) {
    await this.assertMember(userId, groupId);
    const take = Math.min(Math.max(1, limit), 50);

    const qb = this.posts
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.author', 'author')
      .leftJoinAndSelect('author.user', 'authorUser')
      .where('p.groupId = :groupId', { groupId })
      .andWhere('p.pinnedAt IS NULL')
      .orderBy('p.createdAt', 'DESC')
      .take(take + 1); // 다음 쪽이 있는지 보려고 한 개 더
    if (cursor) qb.andWhere('p.createdAt < :cursor', { cursor });
    const rows = await qb.getMany();

    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;
    // 첫 쪽에서만 공지를 함께 내려준다
    const pinned = cursor
      ? []
      : await this.posts.find({
          where: { groupId, pinnedAt: Not(IsNull()) },
          relations: { author: { user: true } },
          order: { pinnedAt: 'DESC' },
        });

    const counts = await this.commentCounts(
      [...pinned, ...page].map((p) => p.id),
    );
    const shape = (p: Post) => ({
      ...this.postJson(p, userId),
      commentCount: counts.get(p.id) ?? 0,
    });
    return {
      pinned: pinned.map(shape),
      posts: page.map(shape),
      // 다음 쪽을 부를 때 그대로 돌려주면 된다
      nextCursor: hasMore ? page[page.length - 1].createdAt.toISOString() : null,
    };
  }

  // 공지로 올리거나 내린다. 가족 누구나 — 공지는 가족 모두가 보는 알림이라서.
  async setPinned(userId: string, postId: string, pinned: boolean) {
    const post = await this.mustPost(postId);
    await this.assertMember(userId, post.groupId);
    if (pinned && !post.pinnedAt) {
      const now = await this.posts.countBy({
        groupId: post.groupId,
        pinnedAt: Not(IsNull()),
      });
      if (now >= MAX_PINNED_POSTS) {
        throw new BadRequestException(
          `공지는 ${MAX_PINNED_POSTS}개까지 올릴 수 있어요. 하나를 내리고 다시 시도해주세요.`,
        );
      }
      if (!post.title) {
        throw new BadRequestException('공지는 제목이 필요해요.');
      }
    }
    post.pinnedAt = pinned ? (post.pinnedAt ?? new Date()) : null;
    await this.posts.save(post);
    return this.getOne(userId, postId);
  }

  async getOne(userId: string, postId: string) {
    // 글쓴이까지 함께 — 화면이 '누가 썼는지'와 '내 글인지'를 보여준다
    const post = await this.posts.findOne({
      where: { id: postId },
      relations: { author: { user: true } },
    });
    if (!post) throw new NotFoundException('글을 찾을 수 없습니다.');
    await this.assertMember(userId, post.groupId);
    const { count, comments } = await this.listComments(userId, postId);
    return { ...this.postJson(post, userId), commentCount: count, comments };
  }

  async create(userId: string, groupId: string, dto: CreatePostDto) {
    const me = await this.assertMember(userId, groupId);
    const text = this.cleanText(dto.text, MAX_POST_LENGTH, '글');
    const { title, pinnedAt } = await this.noticeFields(groupId, dto, null);
    const saved = await this.posts.save(
      this.posts.create({
        title,
        text,
        pinnedAt,
        links: await this.linkPreviews.previewAll(extractUrls(text)),
        groupId,
        authorId: me.id,
      }),
    );
    return this.getOne(userId, saved.id);
  }

  async update(userId: string, postId: string, dto: UpdatePostDto) {
    const post = await this.mustOwnPost(userId, postId);
    post.text = this.cleanText(dto.text, MAX_POST_LENGTH, '글');
    const notice = await this.noticeFields(post.groupId, dto, post);
    post.title = notice.title;
    post.pinnedAt = notice.pinnedAt;
    // 그대로 남은 링크는 전에 읽어 둔 카드를 쓰고, 새로 넣은 링크만 읽는다
    post.links = await this.linkPreviews.previewAll(
      extractUrls(post.text),
      post.links ?? [],
    );
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
      if (c.parentId)
        byId.get(c.parentId)?.replies.push(this.commentJson(c, userId));
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
      if (!parent)
        throw new NotFoundException('답글을 달 댓글을 찾을 수 없습니다.');
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
        if (
          parent?.deletedAt &&
          !(await this.comments.existsBy({ parentId }))
        ) {
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

  // 공지로 올릴 때만 제목을 둔다. 공지가 아니면 제목도 비운다 —
  // 제목만 남아 있으면 '공지였던 글' 인지 헷갈린다.
  private async noticeFields(
    groupId: string,
    dto: { title?: string | null; pinned?: boolean },
    current: Post | null,
  ) {
    const pinned = dto.pinned ?? !!current?.pinnedAt;
    if (!pinned) return { title: null, pinnedAt: null };

    const title = (dto.title ?? current?.title ?? '').trim();
    if (!title) throw new BadRequestException('공지는 제목이 필요해요.');
    if (title.length > MAX_POST_TITLE_LENGTH) {
      throw new BadRequestException(
        `제목은 ${MAX_POST_TITLE_LENGTH}자까지 쓸 수 있어요.`,
      );
    }
    // 이미 공지면 자리를 지키고, 새로 올리는 것이면 개수를 센다
    if (current?.pinnedAt) return { title, pinnedAt: current.pinnedAt };
    const now = await this.posts.countBy({
      groupId,
      pinnedAt: Not(IsNull()),
    });
    if (now >= MAX_PINNED_POSTS) {
      throw new BadRequestException(
        `공지는 ${MAX_PINNED_POSTS}개까지 올릴 수 있어요. 하나를 내리고 다시 시도해주세요.`,
      );
    }
    return { title, pinnedAt: new Date() };
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
      title: p.title ?? null,
      pinned: !!p.pinnedAt,
      text: p.text,
      // 본문의 링크 카드 (본문 순서대로). 화면은 본문에서 이 주소가 있던 자리에 카드를 끼운다.
      links: p.links ?? [],
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
