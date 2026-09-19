import { MigrationInterface, QueryRunner } from 'typeorm';

// 한마디 기록 (mood_log).
// membership.mood 는 덮어쓰기라 지난 한마디가 남지 않는다. 남긴 순간을 한 줄씩 쌓는다.
// 지금 걸려 있는 한마디는 배포 시점에 한 줄로 옮겨 담는다 — 안 그러면 기록 화면이 비어서 시작한다.
export class MoodLog1789490000000 implements MigrationInterface {
  name = 'MoodLog1789490000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "mood_log" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "text" character varying(100) NOT NULL,
        "emoji" character varying(16),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "groupId" uuid NOT NULL,
        "authorId" uuid,
        CONSTRAINT "PK_mood_log" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "mood_log"
      ADD CONSTRAINT "FK_mood_log_group" FOREIGN KEY ("groupId")
      REFERENCES "group"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "mood_log"
      ADD CONSTRAINT "FK_mood_log_author" FOREIGN KEY ("authorId")
      REFERENCES "membership"("id") ON DELETE SET NULL
    `);
    // 가족의 최신 기록을 뽑는 게 유일한 조회 방식이다
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_mood_log_group_created"
      ON "mood_log" ("groupId", "createdAt")
    `);

    // 지금 걸려 있는 한마디를 첫 줄로 옮겨 담는다 (시각은 moodAt, 없으면 지금)
    await queryRunner.query(`
      INSERT INTO "mood_log" ("text", "emoji", "createdAt", "groupId", "authorId")
      SELECT m."mood", m."moodEmoji", COALESCE(m."moodAt", now()), m."groupId", m."id"
      FROM "membership" m
      WHERE m."mood" IS NOT NULL AND m."mood" <> '' AND m."groupId" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "mood_log"`);
  }
}
