import { MigrationInterface, QueryRunner } from 'typeorm';

// 한마디·프로필 사진 변경 기록(mood_log, profile_log) + 모든 시각 컬럼을 timestamptz 로.
//
// timestamp(시간대 없음)는 '벽시계 숫자'만 담아, 어느 시간대에서 쓴 값인지 알 수 없다.
// 앱 프로세스의 TZ 가 바뀌면 같은 컬럼에 다른 기준의 값이 섞인다. timestamptz 는 절대 시각을
// 담으므로 서버·기기 시간대와 무관하게 정확하다. 기존 값은 UTC 로 쓰인 것으로 본다.
//
// 타입 변경은 ALTER ... USING 으로 제자리에서 한다 (생성기 기본값인 DROP 후 ADD 는 시각을 지운다).

export class Logs1789834272147 implements MigrationInterface {
    name = 'Logs1789834272147'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "mood_log" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "text" character varying(100) NOT NULL,
                "emoji" character varying(16),
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "groupId" uuid NOT NULL,
                "authorId" uuid,
                CONSTRAINT "PK_9f332fef75c6259bf26f25ef90c" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_c03f2feb1fef9ceeaa010d4d96" ON "mood_log" ("groupId", "createdAt")
        `);
        await queryRunner.query(`
            CREATE TABLE "profile_log" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "photoUrl" character varying(500),
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "groupId" uuid NOT NULL,
                "authorId" uuid,
                CONSTRAINT "PK_572b73667d88dd69fa34a75ce02" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_c71fe3474ac8e4aeba7b50be24" ON "profile_log" ("groupId", "createdAt")
        `);
        await queryRunner.query(`
            ALTER TABLE "invite" ALTER COLUMN "createdAt"
            TYPE TIMESTAMP WITH TIME ZONE USING "createdAt" AT TIME ZONE 'UTC'
        `);
        await queryRunner.query(`
            ALTER TABLE "group" ALTER COLUMN "createdAt"
            TYPE TIMESTAMP WITH TIME ZONE USING "createdAt" AT TIME ZONE 'UTC'
        `);
        await queryRunner.query(`
            ALTER TABLE "membership" ALTER COLUMN "createdAt"
            TYPE TIMESTAMP WITH TIME ZONE USING "createdAt" AT TIME ZONE 'UTC'
        `);
        await queryRunner.query(`
            ALTER TABLE "user" ALTER COLUMN "createdAt"
            TYPE TIMESTAMP WITH TIME ZONE USING "createdAt" AT TIME ZONE 'UTC'
        `);
        await queryRunner.query(`
            ALTER TABLE "word" ALTER COLUMN "createdAt"
            TYPE TIMESTAMP WITH TIME ZONE USING "createdAt" AT TIME ZONE 'UTC'
        `);
        await queryRunner.query(`
            ALTER TABLE "word" ALTER COLUMN "updatedAt"
            TYPE TIMESTAMP WITH TIME ZONE USING "updatedAt" AT TIME ZONE 'UTC'
        `);
        await queryRunner.query(`
            ALTER TABLE "media" ALTER COLUMN "createdAt"
            TYPE TIMESTAMP WITH TIME ZONE USING "createdAt" AT TIME ZONE 'UTC'
        `);
        await queryRunner.query(`
            ALTER TABLE "media_comment" ALTER COLUMN "createdAt"
            TYPE TIMESTAMP WITH TIME ZONE USING "createdAt" AT TIME ZONE 'UTC'
        `);
        await queryRunner.query(`
            ALTER TABLE "media_comment" ALTER COLUMN "updatedAt"
            TYPE TIMESTAMP WITH TIME ZONE USING "updatedAt" AT TIME ZONE 'UTC'
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_1405a58e01b08c89e56a830080"
        `);
        await queryRunner.query(`
            ALTER TABLE "pending_upload" ALTER COLUMN "createdAt"
            TYPE TIMESTAMP WITH TIME ZONE USING "createdAt" AT TIME ZONE 'UTC'
        `);
        await queryRunner.query(`
            ALTER TABLE "answer" ALTER COLUMN "createdAt"
            TYPE TIMESTAMP WITH TIME ZONE USING "createdAt" AT TIME ZONE 'UTC'
        `);
        await queryRunner.query(`
            ALTER TABLE "answer" ALTER COLUMN "updatedAt"
            TYPE TIMESTAMP WITH TIME ZONE USING "updatedAt" AT TIME ZONE 'UTC'
        `);
        await queryRunner.query(`
            ALTER TABLE "question" ALTER COLUMN "createdAt"
            TYPE TIMESTAMP WITH TIME ZONE USING "createdAt" AT TIME ZONE 'UTC'
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_1405a58e01b08c89e56a830080" ON "pending_upload" ("createdAt")
        `);
        await queryRunner.query(`
            ALTER TABLE "mood_log"
            ADD CONSTRAINT "FK_f64e14087b59bfc2cee75275cb1" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "mood_log"
            ADD CONSTRAINT "FK_3cb7e6f0d34d4d8e0afc450cffb" FOREIGN KEY ("authorId") REFERENCES "membership"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "profile_log"
            ADD CONSTRAINT "FK_ffc85974c22abfa1b99fe0fc02e" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "profile_log"
            ADD CONSTRAINT "FK_4dfcec0c1e4525f1b4083d8a3d3" FOREIGN KEY ("authorId") REFERENCES "membership"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        // 지금 걸려 있는 한마디·프로필 사진을 기록의 첫 줄로 옮겨 담는다 —
        // 안 그러면 배포 직후 기록 화면이 비어서 시작한다.
        await queryRunner.query(`
            INSERT INTO "mood_log" ("text", "emoji", "createdAt", "groupId", "authorId")
            SELECT m."mood", m."moodEmoji", COALESCE(m."moodAt", now()), m."groupId", m."id"
            FROM "membership" m
            WHERE m."mood" IS NOT NULL AND m."mood" <> '' AND m."groupId" IS NOT NULL
        `);
        // 사진은 언제 바꿨는지 남아 있지 않다. now() 로 넣으면 전원이 방금 바꾼 것처럼
        // 목록 맨 위에 몰리므로 '가족에 참여한 때'로 둔다.
        await queryRunner.query(`
            INSERT INTO "profile_log" ("photoUrl", "createdAt", "groupId", "authorId")
            SELECT m."photoUrl", m."createdAt", m."groupId", m."id"
            FROM "membership" m
            WHERE m."photoUrl" IS NOT NULL AND m."groupId" IS NOT NULL
        `);

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "profile_log" DROP CONSTRAINT "FK_4dfcec0c1e4525f1b4083d8a3d3"
        `);
        await queryRunner.query(`
            ALTER TABLE "profile_log" DROP CONSTRAINT "FK_ffc85974c22abfa1b99fe0fc02e"
        `);
        await queryRunner.query(`
            ALTER TABLE "mood_log" DROP CONSTRAINT "FK_3cb7e6f0d34d4d8e0afc450cffb"
        `);
        await queryRunner.query(`
            ALTER TABLE "mood_log" DROP CONSTRAINT "FK_f64e14087b59bfc2cee75275cb1"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_1405a58e01b08c89e56a830080"
        `);
        await queryRunner.query(`
            ALTER TABLE "question" ALTER COLUMN "createdAt"
            TYPE TIMESTAMP USING "createdAt" AT TIME ZONE 'UTC'
        `);
        await queryRunner.query(`
            ALTER TABLE "answer" ALTER COLUMN "updatedAt"
            TYPE TIMESTAMP USING "updatedAt" AT TIME ZONE 'UTC'
        `);
        await queryRunner.query(`
            ALTER TABLE "answer" ALTER COLUMN "createdAt"
            TYPE TIMESTAMP USING "createdAt" AT TIME ZONE 'UTC'
        `);
        await queryRunner.query(`
            ALTER TABLE "pending_upload" ALTER COLUMN "createdAt"
            TYPE TIMESTAMP USING "createdAt" AT TIME ZONE 'UTC'
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_1405a58e01b08c89e56a830080" ON "pending_upload" USING btree ("createdAt")
        `);
        await queryRunner.query(`
            ALTER TABLE "media_comment" ALTER COLUMN "updatedAt"
            TYPE TIMESTAMP USING "updatedAt" AT TIME ZONE 'UTC'
        `);
        await queryRunner.query(`
            ALTER TABLE "media_comment" ALTER COLUMN "createdAt"
            TYPE TIMESTAMP USING "createdAt" AT TIME ZONE 'UTC'
        `);
        await queryRunner.query(`
            ALTER TABLE "media" ALTER COLUMN "createdAt"
            TYPE TIMESTAMP USING "createdAt" AT TIME ZONE 'UTC'
        `);
        await queryRunner.query(`
            ALTER TABLE "word" ALTER COLUMN "updatedAt"
            TYPE TIMESTAMP USING "updatedAt" AT TIME ZONE 'UTC'
        `);
        await queryRunner.query(`
            ALTER TABLE "word" ALTER COLUMN "createdAt"
            TYPE TIMESTAMP USING "createdAt" AT TIME ZONE 'UTC'
        `);
        await queryRunner.query(`
            ALTER TABLE "user" ALTER COLUMN "createdAt"
            TYPE TIMESTAMP USING "createdAt" AT TIME ZONE 'UTC'
        `);
        await queryRunner.query(`
            ALTER TABLE "membership" ALTER COLUMN "createdAt"
            TYPE TIMESTAMP USING "createdAt" AT TIME ZONE 'UTC'
        `);
        await queryRunner.query(`
            ALTER TABLE "group" ALTER COLUMN "createdAt"
            TYPE TIMESTAMP USING "createdAt" AT TIME ZONE 'UTC'
        `);
        await queryRunner.query(`
            ALTER TABLE "invite" ALTER COLUMN "createdAt"
            TYPE TIMESTAMP USING "createdAt" AT TIME ZONE 'UTC'
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_c71fe3474ac8e4aeba7b50be24"
        `);
        await queryRunner.query(`
            DROP TABLE "profile_log"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_c03f2feb1fef9ceeaa010d4d96"
        `);
        await queryRunner.query(`
            DROP TABLE "mood_log"
        `);
    }

}
