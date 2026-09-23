import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MediaComment } from '../entities/media-comment.entity';
import { Membership } from '../entities/membership.entity';

export const DEFAULT_NOTIFICATION_LIMIT = 30;
const MAX_NOTIFICATION_LIMIT = 100;

// 알림 — 내 일상 글에 달린 댓글과, 내 댓글에 달린 답글.
// 내가 쓴 것은 빼고, 지운 댓글도 뺀다. 최근 활동(가족 전체 소식)과 달리 '나에게 온 것' 만 모은다.
@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(MediaComment)
    private readonly comments: Repository<MediaComment>,
    @InjectRepository(Membership)
    private readonly memberships: Repository<Membership>,
  ) {}

  async list(
    userId: string,
    groupId: string,
    limit = DEFAULT_NOTIFICATION_LIMIT,
  ) {
    const me = await this.assertMember(userId, groupId);
    const take = Math.min(Math.max(1, limit), MAX_NOTIFICATION_LIMIT);

    // 내 글의 댓글 + 내 댓글의 답글. 한 번에 찾으려고 글·부모댓글을 같이 읽는다.
    const rows = await this.comments
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.author', 'author')
      .leftJoin('author.user', 'authorUser')
      .addSelect(['authorUser.id', 'authorUser.name'])
      .leftJoin('c.media', 'media')
      .addSelect([
        'media.id',
        'media.items',
        'media.photoUrl',
        'media.authorId',
      ])
      .leftJoin('c.parent', 'parent')
      .addSelect(['parent.id', 'parent.authorId'])
      .where('c.groupId = :groupId', { groupId })
      .andWhere('c.deletedAt IS NULL')
      .andWhere('c.authorId IS DISTINCT FROM :me', { me: me.id })
      .andWhere('(media.authorId = :me OR parent.authorId = :me)', {
        me: me.id,
      })
      .orderBy('c.createdAt', 'DESC')
      .take(take)
      .getMany();

    const seenAt = me.notificationsSeenAt;
    const items = rows.map((c) => ({
      id: c.id,
      // 누르면 그 일상 글로
      mediaId: c.mediaId,
      // 답글이면 '내 댓글에 답글', 아니면 '내 글에 댓글'
      kind: c.parentId ? ('reply' as const) : ('comment' as const),
      text: c.text,
      coverUrl: c.media?.items?.[0]?.url ?? c.media?.photoUrl ?? null,
      createdAt: c.createdAt,
      unread: !seenAt || c.createdAt > seenAt,
      author: c.author
        ? {
            userId: c.author.user?.id ?? null,
            nickname: c.author.nickname,
            name: c.author.user?.name ?? '',
            photoUrl: c.author.photoUrl ?? null,
          }
        : null,
    }));
    return { unread: items.filter((i) => i.unread).length, items };
  }

  // 알림 화면을 열었다 — 지금까지 온 것은 읽은 것으로 본다
  async markSeen(userId: string, groupId: string) {
    const me = await this.assertMember(userId, groupId);
    me.notificationsSeenAt = new Date();
    await this.memberships.save(me);
    return { ok: true };
  }

  private async assertMember(userId: string, groupId: string) {
    const m = await this.memberships.findOne({
      where: { user: { id: userId }, group: { id: groupId } },
    });
    if (!m) throw new ForbiddenException('이 그룹의 구성원이 아닙니다.');
    return m;
  }
}
