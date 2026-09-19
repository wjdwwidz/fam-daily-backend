import { MigrationInterface, QueryRunner } from "typeorm";

export class BucketCreatedBy1789840206992 implements MigrationInterface {
    name = 'BucketCreatedBy1789840206992'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "bucket_item"
            ADD "createdById" uuid
        `);
        await queryRunner.query(`
            ALTER TABLE "bucket_item"
            ADD CONSTRAINT "FK_af74bdbf166ff75295d41ac0398" FOREIGN KEY ("createdById") REFERENCES "membership"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "bucket_item" DROP CONSTRAINT "FK_af74bdbf166ff75295d41ac0398"
        `);
        await queryRunner.query(`
            ALTER TABLE "bucket_item" DROP COLUMN "createdById"
        `);
    }

}
