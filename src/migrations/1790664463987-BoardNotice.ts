import { MigrationInterface, QueryRunner } from "typeorm";

// 게시판에 공지 — 제목(공지일 때만)과 공지로 올린 시각

export class BoardNotice1790664463987 implements MigrationInterface {
    name = 'BoardNotice1790664463987'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "post"
            ADD "title" character varying(60)
        `);
        await queryRunner.query(`
            ALTER TABLE "post"
            ADD "pinnedAt" TIMESTAMP WITH TIME ZONE
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "post" DROP COLUMN "pinnedAt"
        `);
        await queryRunner.query(`
            ALTER TABLE "post" DROP COLUMN "title"
        `);
    }

}
