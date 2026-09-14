import type { DataSource, EntityManager } from 'typeorm';
import { Membership } from '../entities/membership.entity';
import { User } from '../entities/user.entity';
import type { StorageService } from './storage.service';

// 프로필 사진 파일은 여러 곳이 같이 가리킬 수 있다.
// 가족별 사진을 도입할 때 계정 사진을 참여 중인 가족마다 옮겨 담았기 때문이다.
// 그래서 어느 가족(membership)도, 어느 계정(user)도 안 쓰는 파일만 지운다.
//
// DB 변경이 확정된 뒤에 부른다 (트랜잭션 밖).
export async function removeUnusedProfilePhotos(
  db: DataSource | EntityManager,
  storage: StorageService,
  urls: (string | null | undefined)[],
) {
  for (const url of new Set(urls.filter((u): u is string => !!u))) {
    const usedByMember = await db
      .getRepository(Membership)
      .existsBy({ photoUrl: url });
    if (usedByMember) continue;
    const usedByUser = await db.getRepository(User).existsBy({ photoUrl: url });
    if (usedByUser) continue;
    await storage.removeByUrl(url);
  }
}
