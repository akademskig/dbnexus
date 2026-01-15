import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { ConnectionsModule } from './connections/connections.module.js';
import { QueriesModule } from './queries/queries.module.js';
import { SchemaModule } from './schema/schema.module.js';
import { MetadataModule } from './metadata/metadata.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { SyncModule } from './sync/sync.module.js';
import { HealthModule } from './health/health.module.js';
import { ScannerModule } from './scanner/scanner.module.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

@Module({
    imports: [
        // Serve static files from web build in production
        ...(process.env.NODE_ENV === 'production'
            ? [
                  ServeStaticModule.forRoot({
                      rootPath: join(__dirname, '..', '..', '..', 'web', 'dist'),
                      exclude: ['/api*'],
                  }),
              ]
            : []),
        MetadataModule,
        ConnectionsModule,
        QueriesModule,
        SchemaModule,
        ProjectsModule,
        SyncModule,
        HealthModule,
        ScannerModule,
    ],
})
export class AppModule {}
