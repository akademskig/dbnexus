import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import {
    MetadataDatabase,
    ConnectionRepository,
    QueryRepository,
    MigrationHistoryRepository,
    ProjectRepository,
    DatabaseGroupRepository,
} from '@dbnexus/metadata';
import * as path from 'node:path';
import * as fs from 'node:fs';

@Injectable()
export class MetadataService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(MetadataService.name);
    private db!: MetadataDatabase;
    private _connectionRepository!: ConnectionRepository;
    private _queryRepository!: QueryRepository;
    private _migrationHistoryRepository!: MigrationHistoryRepository;
    private _projectRepository!: ProjectRepository;
    private _databaseGroupRepository!: DatabaseGroupRepository;

    onModuleInit() {
        // Get workspace path from environment or use current directory
        const workspacePath = process.env['DBNEXUS_WORKSPACE'] ?? process.cwd();
        const dbnexusDir = path.join(workspacePath, '.dbnexus');

        // Ensure .dbnexus directory exists
        if (!fs.existsSync(dbnexusDir)) {
            fs.mkdirSync(dbnexusDir, { recursive: true });
        }

        const dbPath = path.join(dbnexusDir, 'metadata.db');
        this.db = new MetadataDatabase(dbPath);
        this.db.initialize();

        this._connectionRepository = new ConnectionRepository(this.db);
        this._queryRepository = new QueryRepository(this.db);
        this._migrationHistoryRepository = new MigrationHistoryRepository(this.db);
        this._projectRepository = new ProjectRepository(this.db);
        this._databaseGroupRepository = new DatabaseGroupRepository(this.db);

        this.logger.log(`📦 Metadata database initialized at ${dbPath}`);
    }

    onModuleDestroy() {
        this.db?.close();
    }

    get connectionRepository(): ConnectionRepository {
        return this._connectionRepository;
    }

    get queryRepository(): QueryRepository {
        return this._queryRepository;
    }

    get migrationHistoryRepository(): MigrationHistoryRepository {
        return this._migrationHistoryRepository;
    }

    get projectRepository(): ProjectRepository {
        return this._projectRepository;
    }

    get databaseGroupRepository(): DatabaseGroupRepository {
        return this._databaseGroupRepository;
    }

    get database(): MetadataDatabase {
        return this.db;
    }
}
