import type { EntityManager } from 'typeorm';
import { Group } from '../entities/group.entity';
import { Membership } from '../entities/membership.entity';
import { Media } from '../entities/media.entity';
import { Word } from '../entities/word.entity';
import { PendingUpload } from '../entities/pending-upload.entity';

// 가족 공간 하나를 DB 에서 통째로 지우고, 지워야 할 스토리지 파일 목록을 돌려준다.
// 가족 삭제(방장)와 회원 탈퇴(혼자 남은 가족) 가 같이 쓴다.
//
// 반드시 트랜잭션 안에서 부르고, 파일은 트랜잭션이 끝난 뒤에 지운다.
// 먼저 지우면 DB 가 롤백돼도 파일은 되돌릴 수 없다.
export async function removeGroupData(m: EntityManager, groupId: string) {
  const urls: string[] = [];

  const media = await m.find(Media, { where: { groupId } });
  for (const row of media) {
    for (const it of row.items ?? []) urls.push(it.url);
    if (row.photoUrl) urls.push(row.photoUrl);
  }

  const words = await m.find(Word, { where: { groupId } });
  for (const w of words) {
    urls.push(...(w.photoUrls ?? []));
    if (w.photoUrl) urls.push(w.photoUrl);
  }

  // 이 가족에서 쓰던 프로필 사진. 같은 사람의 다른 가족·계정이 같은 파일을 쓸 수 있어서
  // 바로 지우지 않고 따로 돌려준다 → removeUnusedProfilePhotos
  const members = await m.find(Membership, { where: { group: { id: groupId } } });
  const profileUrls = members.map((mm) => mm.photoUrl).filter((u): u is string => !!u);

  // 올리다 만 파일 자리는 그룹과 FK 로 묶여 있지 않아 따로 지운다
  const pendings = await m.find(PendingUpload, { where: { groupId } });
  await m.delete(PendingUpload, { groupId });

  // 글·단어·문답·초대·멤버십은 FK CASCADE 로 함께 사라진다
  await m.delete(Group, { id: groupId });

  return {
    urls: [...new Set(urls)],
    paths: pendings.map((p) => p.path),
    profileUrls,
  };
}
