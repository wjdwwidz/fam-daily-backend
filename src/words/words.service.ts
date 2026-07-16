import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Word } from '../entities/word.entity';
import { Membership } from '../entities/membership.entity';
import { CreateWordDto, UpdateWordDto } from './dto/word.dto';

@Injectable()
export class WordsService {
  constructor(
    @InjectRepository(Word) private readonly words: Repository<Word>,
    @InjectRepository(Membership)
    private readonly memberships: Repository<Membership>,
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
    const word = await this.words.save(
      this.words.create({
        term: dto.term,
        reading: dto.reading ?? '',
        meaning: dto.meaning,
        example: dto.example ?? '',
        photoUrl: dto.photoUrl ?? null,
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
    Object.assign(word, {
      term: dto.term ?? word.term,
      reading: dto.reading ?? word.reading,
      meaning: dto.meaning ?? word.meaning,
      example: dto.example ?? word.example,
      photoUrl: dto.photoUrl !== undefined ? dto.photoUrl : word.photoUrl,
    });
    await this.words.save(word);
    return this.getOne(userId, wordId);
  }

  async remove(userId: string, wordId: string) {
    const word = await this.words.findOne({ where: { id: wordId } });
    if (!word) throw new NotFoundException('단어를 찾을 수 없습니다.');
    await this.assertMember(userId, word.groupId);
    await this.words.remove(word);
    return { ok: true };
  }

  private async assertMember(userId: string, groupId: string) {
    const m = await this.memberships.findOne({
      where: { user: { id: userId }, group: { id: groupId } },
    });
    if (!m) throw new ForbiddenException('이 그룹의 구성원이 아닙니다.');
    return m;
  }

  private serialize(w: Word) {
    return {
      id: w.id,
      term: w.term,
      reading: w.reading,
      meaning: w.meaning,
      example: w.example,
      photoUrl: w.photoUrl,
      createdAt: w.createdAt,
      author: w.author
        ? { nickname: w.author.nickname, name: w.author.user?.name ?? '' }
        : null,
    };
  }
}
