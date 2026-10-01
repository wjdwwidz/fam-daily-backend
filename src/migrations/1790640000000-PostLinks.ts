import { MigrationInterface, QueryRunner } from 'typeorm';

// 게시판 글에 붙인 링크의 카드 정보 (제목·요약·썸네일). 이미 있는 글은 빈 목록으로 시작한다.
export class PostLinks1790640000000 implements MigrationInterface {
  name = 'PostLinks1790640000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "post" ADD "links" jsonb NOT NULL DEFAULT '[]'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "post" DROP COLUMN "links"`);
  }
}
