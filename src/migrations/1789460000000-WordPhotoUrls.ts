import { MigrationInterface, QueryRunner } from "typeorm";

// 사전 단어에 사진 여러 장(photoUrls) 추가.
// 기존 한 장짜리 photoUrl 은 지우지 않고 첫 장으로 옮겨 담는다 — 예전 앱과 롤백을 위해 컬럼은 남긴다.
export class WordPhotoUrls1789460000000 implements MigrationInterface {
    name = 'WordPhotoUrls1789460000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "word" ADD COLUMN IF NOT EXISTS "photoUrls" jsonb NOT NULL DEFAULT '[]'
        `);
        await queryRunner.query(`
            UPDATE "word" SET "photoUrls" = jsonb_build_array("photoUrl")
            WHERE "photoUrl" IS NOT NULL AND "photoUrls" = '[]'::jsonb
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 두 번째 장부터는 사라진다. 첫 장은 photoUrl 에 남아 있다.
        await queryRunner.query(`
            ALTER TABLE "word" DROP COLUMN "photoUrls"
        `);
    }
}
