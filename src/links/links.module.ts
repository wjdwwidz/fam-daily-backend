import { Module } from '@nestjs/common';
import { LinkPreviewService } from './link-preview.service';
import { LinksController } from './links.controller';

@Module({
  controllers: [LinksController],
  providers: [LinkPreviewService],
  exports: [LinkPreviewService],
})
export class LinksModule {}
