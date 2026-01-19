import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import {
    MetadataDatabase,
    ConnectionRepository,
    QueryRepository,
    MigrationHistoryRepository,
    ProjectRepository,
    DatabaseGroupRepository,
    SyncConfigRepository,
    SyncRunRepository,
    SchemaSnapshotRepository,
    AuditLogRepository,
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
    private _syncConfigRepository!: SyncConfigRepository;
    private _syncRunRepository!: SyncRunRepository;
    private _schemaSnapshotRepository!: SchemaSnapshotRepository;
    private _auditLogRepository!: AuditLogRepository;

    onModuleInit() {
        // Get data directory path
        // Priority: DBNEXUS_DATA_DIR > DBNEXUS_WORKSPACE > user home directory
        let dbnexusDir: string;

        if (process.env['DBNEXUS_DATA_DIR']) {
            // Explicit data directory
            dbnexusDir = process.env['DBNEXUS_DATA_DIR'];
        } else if (process.env['DBNEXUS_WORKSPACE']) {
            // Legacy workspace directory
            dbnexusDir = path.join(process.env['DBNEXUS_WORKSPACE'], '.dbnexus');
        } else {
            // Default to user home directory for global installation
            const homeDir =
                process.env['HOME'] ||
                process.env['USERPROFILE'] ||
                process.env['HOMEPATH'] ||
                process.cwd();
            dbnexusDir = path.join(homeDir, '.dbnexus');
        }

        // Ensure directory exists
        if (!fs.existsSync(dbnexusDir)) {
            fs.mkdirSync(dbnexusDir, { recursive: true });
            this.logger.log(`📁 Created data directory at ${dbnexusDir}`);
        }

        const dbPath = path.join(dbnexusDir, 'metadata.db');
        this.db = new MetadataDatabase(dbPath);
        this.db.initialize();

        this._connectionRepository = new ConnectionRepository(this.db);
        this._queryRepository = new QueryRepository(this.db);
        this._migrationHistoryRepository = new MigrationHistoryRepository(this.db);
        this._projectRepository = new ProjectRepository(this.db);
        this._databaseGroupRepository = new DatabaseGroupRepository(this.db);
        this._syncConfigRepository = new SyncConfigRepository(this.db);
        this._syncRunRepository = new SyncRunRepository(this.db);
        this._schemaSnapshotRepository = new SchemaSnapshotRepository(this.db);
        this._auditLogRepository = new AuditLogRepository(this.db);

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

    get syncConfigRepository(): SyncConfigRepository {
        return this._syncConfigRepository;
    }

    get syncRunRepository(): SyncRunRepository {
        return this._syncRunRepository;
    }

    get schemaSnapshotRepository(): SchemaSnapshotRepository {
        return this._schemaSnapshotRepository;
    }

    get auditLogRepository(): AuditLogRepository {
        return this._auditLogRepository;
    }

    get database(): MetadataDatabase {
        return this.db;
    }
}
