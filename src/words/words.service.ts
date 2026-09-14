import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Word } from '../entities/word.entity';
import { Membership } from '../entities/membership.entity';
import {
  CreateWordDto,
  MAX_WORD_PHOTOS,
  UpdateWordDto,
} from './dto/word.dto';
import { StorageService } from '../uploads/storage.service';

// 사전 사진이 올라가는 버킷 폴더 (프론트가 /uploads?folder=words 로 올린다)
const WORD_PHOTO_FOLDER = 'words';

@Injectable()
export class WordsService {
  constructor(
    @InjectRepository(Word) private readonly words: Repository<Word>,
    @InjectRepository(Membership)
    private readonly memberships: Repository<Membership>,
    private readonly storage: StorageService,
  ) {}

  // 그룹 단어 목록 (가나다순은 프론트에서 그룹핑, 여기선 최신순)
  async list(userId: string, groupId: string) {
    await this.assertMember(userId, groupId);
    const words = await this.words.find({
      where: { groupId },
      relations: { author: { user: true } },
      order: { createdAt: 'DESC' },
    });
    return words.map((w) => this.serialize(w));
  }

  async create(userId: string, groupId: string, dto: CreateWordDto) {
    const membership = await this.assertMember(userId, groupId);
    const photos = this.resolvePhotos(dto, []) ?? [];
    this.assertPhotos(photos, []);
    const word = await this.words.save(
      this.words.create({
        term: dto.term,
        reading: dto.reading ?? '',
        meaning: dto.meaning,
        example: dto.example ?? '',
        photoUrls: photos,
        photoUrl: photos[0] ?? null,
        groupId,
        authorId: membership.id,
      }),
    );
    return this.getOne(userId, word.id);
  }

  async getOne(userId: string, wordId: string) {
    const word = await this.words.findOne({
      where: { id: wordId },
      relations: { author: { user: true } },
    });
    if (!word) throw new NotFoundException('단어를 찾을 수 없습니다.');
    await this.assertMember(userId, word.groupId);
    return this.serialize(word);
  }

  async update(userId: string, wordId: string, dto: UpdateWordDto) {
    const word = await this.words.findOne({ where: { id: wordId } });
    if (!word) throw new NotFoundException('단어를 찾을 수 없습니다.');
    await this.assertMember(userId, word.groupId);

    const current = this.photosOf(word);
    const next = this.resolvePhotos(dto, current);
    if (next !== undefined) this.assertPhotos(next, current);

    Object.assign(word, {
      term: dto.term ?? word.term,
      reading: dto.reading ?? word.reading,
      meaning: dto.meaning ?? word.meaning,
      example: dto.example ?? word.example,
    });
    if (next !== undefined) {
      word.photoUrls = next;
      word.photoUrl = next[0] ?? null;
    }
    await this.words.save(word);

    // 빠진 사진은 저장이 DB 에 확정된 뒤에야 파일을 지운다
    if (next !== undefined) {
      await this.removeUnusedPhotos(current.filter((u) => !next.includes(u)));
    }
    return this.getOne(userId, wordId);
  }

  async remove(userId: string, wordId: string) {
    const word = await this.words.findOne({ where: { id: wordId } });
    if (!word) throw new NotFoundException('단어를 찾을 수 없습니다.');
    await this.assertMember(userId, word.groupId);
    const photos = this.photosOf(word);
    await this.words.remove(word);
    await this.removeUnusedPhotos(photos);
    return { ok: true };
  }

  // 요청 → 저장할 사진 목록. undefined 면 사진은 안 바꾼다.
  private resolvePhotos(
    dto: UpdateWordDto,
    current: string[],
  ): string[] | undefined {
    if (dto.photoUrls !== undefined) return [...new Set(dto.photoUrls)];
    // 예전 앱은 첫 장(photoUrl)만 알고, 수정할 때 그대로 다시 보낸다.
    // 첫 장이 그대로면 새 앱에서 넣어둔 나머지 사진도 유지해야 지워지지 않는다.
    if (dto.photoUrl === undefined) return undefined;
    if (dto.photoUrl === null) return [];
    if (dto.photoUrl === current[0]) return current;
    return [dto.photoUrl];
  }

  // 새로 들어온 주소는 앱이 올린 사전 사진만 받는다.
  // 아무 주소나 받으면, 남의 파일 주소를 넣고 단어를 지워 그 파일을 지우게 만들 수 있다.
  private assertPhotos(next: string[], current: string[]) {
    if (next.length > MAX_WORD_PHOTOS) {
      throw new BadRequestException(
        `사진은 ${MAX_WORD_PHOTOS}장까지 넣을 수 있어요.`,
      );
    }
    for (const url of next) {
      if (current.includes(url)) continue;
      if (!this.storage.isInFolder(url, WORD_PHOTO_FOLDER)) {
        throw new BadRequestException('앱에서 올린 사진만 넣을 수 있어요.');
      }
    }
  }

  // 더 이상 어떤 단어도 쓰지 않는 사전 사진 파일만 지운다
  private async removeUnusedPhotos(urls: string[]) {
    for (const url of urls) {
      if (!this.storage.isInFolder(url, WORD_PHOTO_FOLDER)) continue;
      const stillUsed = await this.words
        .createQueryBuilder('w')
        .where('w.photoUrls @> CAST(:arr AS jsonb)', {
          arr: JSON.stringify([url]),
        })
        .orWhere('w.photoUrl = :url', { url })
        .getExists();
      if (!stillUsed) await this.storage.removeByUrl(url);
    }
  }

  private async assertMember(userId: string, groupId: string) {
    const m = await this.memberships.findOne({
      where: { user: { id: userId }, group: { id: groupId } },
    });
    if (!m) throw new ForbiddenException('이 그룹의 구성원이 아닙니다.');
    return m;
  }

  // 마이그레이션 전에 만들어진 한 장짜리 단어는 photoUrl 에만 값이 있다
  private photosOf(w: Word): string[] {
    if (w.photoUrls?.length) return w.photoUrls;
    return w.photoUrl ? [w.photoUrl] : [];
  }

  private serialize(w: Word) {
    const photos = this.photosOf(w);
    return {
      id: w.id,
      term: w.term,
      reading: w.reading,
      meaning: w.meaning,
      example: w.example,
      photoUrls: photos,
      // 업데이트 안 한 앱은 이 값(첫 장)만 읽는다
      photoUrl: photos[0] ?? null,
      createdAt: w.createdAt,
      author: w.author
        ? {
            userId: w.author.user?.id ?? null,
            nickname: w.author.nickname,
            name: w.author.user?.name ?? '',
            photoUrl: w.author.user?.photoUrl ?? null,
          }
        : null,
    };
  }
}
