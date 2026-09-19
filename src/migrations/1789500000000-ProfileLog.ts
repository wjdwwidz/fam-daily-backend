import { MigrationInterface, QueryRunner } from 'typeorm';

// 프로필 사진 변경 기록 (profile_log).
// 지금 쓰고 있는 사진은 한 줄로 옮겨 담되, 시각은 '가족에 참여한 때'로 둔다 —
// 언제 바꿨는지는 남아 있지 않으므로, now() 로 넣으면 전원이 방금 바꾼 것처럼 목록 맨 위에 몰린다.
export class ProfileLog1789500000000 implements MigrationInterface {
  name = 'ProfileLog1789500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "profile_log" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "photoUrl" character varying(500),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "groupId" uuid NOT NULL,
        "authorId" uuid,
        CONSTRAINT "PK_profile_log" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "profile_log"
      ADD CONSTRAINT "FK_profile_log_group" FOREIGN KEY ("groupId")
      REFERENCES "group"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "profile_log"
      ADD CONSTRAINT "FK_profile_log_author" FOREIGN KEY ("authorId")
      REFERENCES "membership"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_profile_log_group_created"
      ON "profile_log" ("groupId", "createdAt")
    `);

    await queryRunner.query(`
      INSERT INTO "profile_log" ("photoUrl", "createdAt", "groupId", "authorId")
      SELECT m."photoUrl", m."createdAt", m."groupId", m."id"
      FROM "membership" m
      WHERE m."photoUrl" IS NOT NULL AND m."groupId" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "profile_log"`);
  }
}
