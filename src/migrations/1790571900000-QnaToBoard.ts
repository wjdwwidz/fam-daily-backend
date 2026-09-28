import { MigrationInterface, QueryRunner } from 'typeorm';

// 문답(질문·답변)을 가족 게시판(글·댓글)으로.
// 테이블을 새로 만들지 않고 이름만 바꿔서 지금까지 쓴 글이 그대로 남게 한다.
//  - question  → post         (updatedAt 추가)
//  - answer    → post_comment (groupId·parentId·deletedAt 추가, questionId → postId)
export class QnaToBoard1790571900000 implements MigrationInterface {
  name = 'QnaToBoard1790571900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "question" RENAME TO "post"`);
    await queryRunner.query(`ALTER TABLE "answer" RENAME TO "post_comment"`);
    await queryRunner.query(
      `ALTER TABLE "post_comment" RENAME COLUMN "questionId" TO "postId"`,
    );

    await queryRunner.query(`
      ALTER TABLE "post"
      ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    `);
    // 옛 글은 고친 적이 없으니 쓴 시각과 같게 둔다 (안 그러면 전부 '수정됨' 으로 보인다)
    await queryRunner.query(`UPDATE "post" SET "updatedAt" = "createdAt"`);

    await queryRunner.query(`
      ALTER TABLE "post_comment"
      ADD "deletedAt" TIMESTAMP WITH TIME ZONE,
      ADD "parentId" uuid,
      ADD "groupId" uuid
    `);
    // 답변에는 가족이 없었다 — 글을 거쳐 채운다
    await queryRunner.query(`
      UPDATE "post_comment" c
      SET "groupId" = p."groupId"
      FROM "post" p
      WHERE c."postId" = p."id"
    `);
    await queryRunner.query(
      `ALTER TABLE "post_comment" ALTER COLUMN "groupId" SET NOT NULL`,
    );

    await queryRunner.query(`
      ALTER TABLE "post_comment"
      ADD CONSTRAINT "FK_post_comment_group" FOREIGN KEY ("groupId")
      REFERENCES "group"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "post_comment"
      ADD CONSTRAINT "FK_post_comment_parent" FOREIGN KEY ("parentId")
      REFERENCES "post_comment"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_post_group_created" ON "post" ("groupId", "createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_post_group_created"`);
    await queryRunner.query(
      `ALTER TABLE "post_comment" DROP CONSTRAINT "FK_post_comment_parent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_comment" DROP CONSTRAINT "FK_post_comment_group"`,
    );
    await queryRunner.query(`
      ALTER TABLE "post_comment"
      DROP COLUMN "groupId",
      DROP COLUMN "parentId",
      DROP COLUMN "deletedAt"
    `);
    await queryRunner.query(`ALTER TABLE "post" DROP COLUMN "updatedAt"`);
    await queryRunner.query(
      `ALTER TABLE "post_comment" RENAME COLUMN "postId" TO "questionId"`,
    );
    await queryRunner.query(`ALTER TABLE "post_comment" RENAME TO "answer"`);
    await queryRunner.query(`ALTER TABLE "post" RENAME TO "question"`);
  }
}
