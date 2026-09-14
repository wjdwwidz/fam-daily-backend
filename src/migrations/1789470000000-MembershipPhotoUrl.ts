import { MigrationInterface, QueryRunner } from "typeorm";

// 가족마다 다른 프로필 사진 (membership.photoUrl).
// 이미 계정 사진을 올린 사람은 지금 참여 중인 가족에 그 사진을 그대로 담아둔다 —
// 안 그러면 배포하는 순간 모든 가족에서 사진이 사라진다. 새로 참여하는 가족은 이니셜로 시작한다.
// 같은 파일을 여러 곳이 가리키게 되므로, 파일은 아무도 안 쓸 때만 지운다 (removeUnusedProfilePhotos).
export class MembershipPhotoUrl1789470000000 implements MigrationInterface {
    name = 'MembershipPhotoUrl1789470000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "membership" ADD COLUMN IF NOT EXISTS "photoUrl" character varying(500)
        `);
        await queryRunner.query(`
            UPDATE "membership" m SET "photoUrl" = u."photoUrl"
            FROM "user" u
            WHERE m."userId" = u."id" AND u."photoUrl" IS NOT NULL AND m."photoUrl" IS NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "membership" DROP COLUMN "photoUrl"
        `);
    }
}
