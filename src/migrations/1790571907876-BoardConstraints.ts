import { MigrationInterface, QueryRunner } from "typeorm";

// 게시판 표 이름을 바꾸면서 손으로 붙인 제약·인덱스를 TypeORM 규칙에 맞춘다

export class BoardConstraints1790571907876 implements MigrationInterface {
    name = 'BoardConstraints1790571907876'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "post_comment" DROP CONSTRAINT "FK_a4013f10cd6924793fbd5f0d637"
        `);
        await queryRunner.query(`
            ALTER TABLE "post_comment" DROP CONSTRAINT "FK_328f85639a97f8ff158e0cf7b1f"
        `);
        await queryRunner.query(`
            ALTER TABLE "post_comment" DROP CONSTRAINT "FK_post_comment_group"
        `);
        await queryRunner.query(`
            ALTER TABLE "post_comment" DROP CONSTRAINT "FK_post_comment_parent"
        `);
        await queryRunner.query(`
            ALTER TABLE "post" DROP CONSTRAINT "FK_ac7c68d428ab7ffd2f4752eeaa2"
        `);
        await queryRunner.query(`
            ALTER TABLE "post" DROP CONSTRAINT "FK_75fc761f2752712276be38e7d13"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_post_group_created"
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_2697e1c46c0545957a155e755c" ON "post" ("groupId", "createdAt")
        `);
        await queryRunner.query(`
            ALTER TABLE "post_comment"
            ADD CONSTRAINT "FK_c7fb3b0d1192f17f7649062f672" FOREIGN KEY ("postId") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "post_comment"
            ADD CONSTRAINT "FK_08df45a8e6f8faa16240ddb6ce3" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "post_comment"
            ADD CONSTRAINT "FK_8018bc65c89f9b88fdb38d02710" FOREIGN KEY ("parentId") REFERENCES "post_comment"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "post_comment"
            ADD CONSTRAINT "FK_a8a5a8cd757122e162e86d78d39" FOREIGN KEY ("authorId") REFERENCES "membership"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "post"
            ADD CONSTRAINT "FK_2393250dfaedc012a2286f7854e" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "post"
            ADD CONSTRAINT "FK_c6fb082a3114f35d0cc27c518e0" FOREIGN KEY ("authorId") REFERENCES "membership"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "post" DROP CONSTRAINT "FK_c6fb082a3114f35d0cc27c518e0"
        `);
        await queryRunner.query(`
            ALTER TABLE "post" DROP CONSTRAINT "FK_2393250dfaedc012a2286f7854e"
        `);
        await queryRunner.query(`
            ALTER TABLE "post_comment" DROP CONSTRAINT "FK_a8a5a8cd757122e162e86d78d39"
        `);
        await queryRunner.query(`
            ALTER TABLE "post_comment" DROP CONSTRAINT "FK_8018bc65c89f9b88fdb38d02710"
        `);
        await queryRunner.query(`
            ALTER TABLE "post_comment" DROP CONSTRAINT "FK_08df45a8e6f8faa16240ddb6ce3"
        `);
        await queryRunner.query(`
            ALTER TABLE "post_comment" DROP CONSTRAINT "FK_c7fb3b0d1192f17f7649062f672"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_2697e1c46c0545957a155e755c"
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_post_group_created" ON "post" USING btree ("createdAt", "groupId")
        `);
        await queryRunner.query(`
            ALTER TABLE "post"
            ADD CONSTRAINT "FK_75fc761f2752712276be38e7d13" FOREIGN KEY ("authorId") REFERENCES "membership"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "post"
            ADD CONSTRAINT "FK_ac7c68d428ab7ffd2f4752eeaa2" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "post_comment"
            ADD CONSTRAINT "FK_post_comment_parent" FOREIGN KEY ("parentId") REFERENCES "post_comment"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "post_comment"
            ADD CONSTRAINT "FK_post_comment_group" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "post_comment"
            ADD CONSTRAINT "FK_328f85639a97f8ff158e0cf7b1f" FOREIGN KEY ("authorId") REFERENCES "membership"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "post_comment"
            ADD CONSTRAINT "FK_a4013f10cd6924793fbd5f0d637" FOREIGN KEY ("postId") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

}
