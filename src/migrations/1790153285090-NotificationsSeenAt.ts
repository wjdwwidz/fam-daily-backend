import { MigrationInterface, QueryRunner } from "typeorm";

// 알림을 마지막으로 본 시각 — 이보다 뒤에 온 댓글·답글이 '안 읽음'
export class NotificationsSeenAt1790153285090 implements MigrationInterface {
    name = 'NotificationsSeenAt1790153285090'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "membership"
            ADD "notificationsSeenAt" TIMESTAMP WITH TIME ZONE
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "membership" DROP COLUMN "notificationsSeenAt"
        `);
    }

}
