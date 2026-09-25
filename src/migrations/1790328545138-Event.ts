import { MigrationInterface, QueryRunner } from "typeorm";

// 가족 일정 (달력) — 생일·약속·여행. 하루면 endDate 는 비운다.

export class Event1790328545138 implements MigrationInterface {
    name = 'Event1790328545138'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "event" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "title" character varying(100) NOT NULL,
                "startDate" date NOT NULL,
                "endDate" date,
                "category" character varying(20),
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "groupId" uuid NOT NULL,
                "createdById" uuid,
                CONSTRAINT "PK_30c2f3bbaf6d34a55f8ae6e4614" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_e943cc1e1b8e0005c81cb027b0" ON "event" ("groupId", "startDate")
        `);
        await queryRunner.query(`
            ALTER TABLE "event"
            ADD CONSTRAINT "FK_0a28dcf5832d1068df34fc59e46" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "event"
            ADD CONSTRAINT "FK_1d5a6b5f38273d74f192ae552a6" FOREIGN KEY ("createdById") REFERENCES "membership"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "event" DROP CONSTRAINT "FK_1d5a6b5f38273d74f192ae552a6"
        `);
        await queryRunner.query(`
            ALTER TABLE "event" DROP CONSTRAINT "FK_0a28dcf5832d1068df34fc59e46"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_e943cc1e1b8e0005c81cb027b0"
        `);
        await queryRunner.query(`
            DROP TABLE "event"
        `);
    }

}
