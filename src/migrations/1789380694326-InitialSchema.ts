import { MigrationInterface, QueryRunner } from "typeorm";

// 기준점(baseline) 마이그레이션 — synchronize 를 끄기 직전의 엔티티 구조 전체.
//
// 운영 DB 와 기존 로컬 DB 는 그동안 synchronize 가 같은 엔티티로 테이블을 만들어 두었다.
// 그런 DB 에서는 아무것도 하지 않고 "적용됨"으로만 기록되게 한다. 빈 DB(새 개발 환경)에서만 테이블을 만든다.
export class InitialSchema1789380694326 implements MigrationInterface {
    name = 'InitialSchema1789380694326'

    public async up(queryRunner: QueryRunner): Promise<void> {
        if (await queryRunner.hasTable('user')) return;

        await queryRunner.query(`
            CREATE TABLE "invite" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "code" character varying NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "expiresAt" TIMESTAMP WITH TIME ZONE,
                "groupId" uuid,
                CONSTRAINT "UQ_ffbbc5bbb052814e22a0c525ff4" UNIQUE ("code"),
                CONSTRAINT "PK_fc9fa190e5a3c5d80604a4f63e1" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "group" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_256aa0fda9b1de1a73ee0b7106b" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."membership_role_enum" AS ENUM('OWNER', 'ADMIN', 'MEMBER')
        `);
        await queryRunner.query(`
            CREATE TABLE "membership" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "nickname" character varying NOT NULL,
                "role" "public"."membership_role_enum" NOT NULL DEFAULT 'MEMBER',
                "mood" character varying(100),
                "moodEmoji" character varying(16),
                "moodAt" TIMESTAMP WITH TIME ZONE,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "userId" uuid,
                "groupId" uuid,
                CONSTRAINT "UQ_9c7d697a4844cf8b931988b24f4" UNIQUE ("userId", "groupId"),
                CONSTRAINT "PK_83c1afebef3059472e7c37e8de8" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "user" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "email" character varying NOT NULL,
                "name" character varying NOT NULL,
                "photoUrl" character varying(500),
                "provider" character varying NOT NULL DEFAULT 'kakao',
                "providerId" character varying,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"),
                CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "word" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "term" character varying NOT NULL,
                "reading" character varying NOT NULL DEFAULT '',
                "meaning" text NOT NULL,
                "example" text NOT NULL DEFAULT '',
                "photoUrl" character varying,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "groupId" uuid NOT NULL,
                "authorId" uuid,
                CONSTRAINT "PK_ad026d65e30f80b7056ca31f666" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "media" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "items" jsonb NOT NULL DEFAULT '[]',
                "photoUrl" character varying(500),
                "caption" text NOT NULL DEFAULT '',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "groupId" uuid NOT NULL,
                "authorId" uuid,
                CONSTRAINT "PK_f4e0fcac36e050de337b670d8bd" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "pending_upload" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "path" character varying(500) NOT NULL,
                "groupId" character varying NOT NULL,
                "userId" character varying NOT NULL,
                "contentType" character varying(100) NOT NULL,
                "size" bigint NOT NULL DEFAULT '0',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_4d277248c6156c95a083fb62081" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_1405a58e01b08c89e56a830080" ON "pending_upload" ("createdAt")
        `);
        await queryRunner.query(`
            CREATE TABLE "answer" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "text" text NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "questionId" uuid NOT NULL,
                "authorId" uuid,
                CONSTRAINT "PK_9232db17b63fb1e94f97e5c224f" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "question" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "text" text NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "groupId" uuid NOT NULL,
                "authorId" uuid,
                CONSTRAINT "PK_21e5786aa0ea704ae185a79b2d5" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "invite"
            ADD CONSTRAINT "FK_c3a2b0cc796a307f2416b2acafe" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "membership"
            ADD CONSTRAINT "FK_eef2d9d9c70cd13bed868afedf4" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "membership"
            ADD CONSTRAINT "FK_8bc1674087575acecf0a648fc91" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "word"
            ADD CONSTRAINT "FK_980f362803eb6bce0aef8cce70e" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "word"
            ADD CONSTRAINT "FK_5c9460a6555845a4350a89d40b1" FOREIGN KEY ("authorId") REFERENCES "membership"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "media"
            ADD CONSTRAINT "FK_871bb680e5f8e7acff29ceee2e7" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "media"
            ADD CONSTRAINT "FK_46a895ee65010e2b94ff317e854" FOREIGN KEY ("authorId") REFERENCES "membership"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "answer"
            ADD CONSTRAINT "FK_a4013f10cd6924793fbd5f0d637" FOREIGN KEY ("questionId") REFERENCES "question"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "answer"
            ADD CONSTRAINT "FK_328f85639a97f8ff158e0cf7b1f" FOREIGN KEY ("authorId") REFERENCES "membership"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "question"
            ADD CONSTRAINT "FK_ac7c68d428ab7ffd2f4752eeaa2" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "question"
            ADD CONSTRAINT "FK_75fc761f2752712276be38e7d13" FOREIGN KEY ("authorId") REFERENCES "membership"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 되돌리면 모든 테이블이 삭제된다. 운영에서 migration:revert 를 한 번 더 누르는 실수로
        // 가족 데이터가 전부 사라지지 않도록 막는다. 로컬 DB 를 비우려면 DB 를 새로 만든다.
        throw new Error('기준점 마이그레이션은 되돌릴 수 없습니다 (모든 테이블 삭제). 로컬이면 DB 를 새로 만드세요.');

        await queryRunner.query(`
            ALTER TABLE "question" DROP CONSTRAINT "FK_75fc761f2752712276be38e7d13"
        `);
        await queryRunner.query(`
            ALTER TABLE "question" DROP CONSTRAINT "FK_ac7c68d428ab7ffd2f4752eeaa2"
        `);
        await queryRunner.query(`
            ALTER TABLE "answer" DROP CONSTRAINT "FK_328f85639a97f8ff158e0cf7b1f"
        `);
        await queryRunner.query(`
            ALTER TABLE "answer" DROP CONSTRAINT "FK_a4013f10cd6924793fbd5f0d637"
        `);
        await queryRunner.query(`
            ALTER TABLE "media" DROP CONSTRAINT "FK_46a895ee65010e2b94ff317e854"
        `);
        await queryRunner.query(`
            ALTER TABLE "media" DROP CONSTRAINT "FK_871bb680e5f8e7acff29ceee2e7"
        `);
        await queryRunner.query(`
            ALTER TABLE "word" DROP CONSTRAINT "FK_5c9460a6555845a4350a89d40b1"
        `);
        await queryRunner.query(`
            ALTER TABLE "word" DROP CONSTRAINT "FK_980f362803eb6bce0aef8cce70e"
        `);
        await queryRunner.query(`
            ALTER TABLE "membership" DROP CONSTRAINT "FK_8bc1674087575acecf0a648fc91"
        `);
        await queryRunner.query(`
            ALTER TABLE "membership" DROP CONSTRAINT "FK_eef2d9d9c70cd13bed868afedf4"
        `);
        await queryRunner.query(`
            ALTER TABLE "invite" DROP CONSTRAINT "FK_c3a2b0cc796a307f2416b2acafe"
        `);
        await queryRunner.query(`
            DROP TABLE "question"
        `);
        await queryRunner.query(`
            DROP TABLE "answer"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_1405a58e01b08c89e56a830080"
        `);
        await queryRunner.query(`
            DROP TABLE "pending_upload"
        `);
        await queryRunner.query(`
            DROP TABLE "media"
        `);
        await queryRunner.query(`
            DROP TABLE "word"
        `);
        await queryRunner.query(`
            DROP TABLE "user"
        `);
        await queryRunner.query(`
            DROP TABLE "membership"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."membership_role_enum"
        `);
        await queryRunner.query(`
            DROP TABLE "group"
        `);
        await queryRunner.query(`
            DROP TABLE "invite"
        `);
    }

}
