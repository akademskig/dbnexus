import { Module, Global } from '@nestjs/common';
import { MetadataService } from './metadata.service.js';

@Global()
@Module({
    providers: [MetadataService],
    exports: [MetadataService],
})
export class MetadataModule {}
