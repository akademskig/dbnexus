import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import {
    MetadataDatabase,
    ConnectionRepository,
    QueryLogsRepository,
    MigrationLogsRepository,
    ProjectRepository,
    DatabaseGroupRepository,
    SyncRunLogsRepository,
    SchemaSnapshotRepository,
    AuditLogRepository,
    BackupRepository,
    BackupLogsRepository,
} from '@dbnexus/metadata';
import * as path from 'node:path';
import * as fs from 'node:fs';

@Injectable()
export class MetadataService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(MetadataService.name);
    private db!: MetadataDatabase;
    private _connectionRepository!: ConnectionRepository;
    private _queryLogsRepository!: QueryLogsRepository;
    private _migrationLogsRepository!: MigrationLogsRepository;
    private _projectRepository!: ProjectRepository;
    private _databaseGroupRepository!: DatabaseGroupRepository;
    private _syncRunLogsRepository!: SyncRunLogsRepository;
    private _schemaSnapshotRepository!: SchemaSnapshotRepository;
    private _auditLogRepository!: AuditLogRepository;
    private _backupRepository!: BackupRepository;
    private _backupLogsRepository!: BackupLogsRepository;

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
        this._queryLogsRepository = new QueryLogsRepository(this.db);
        this._migrationLogsRepository = new MigrationLogsRepository(this.db);
        this._projectRepository = new ProjectRepository(this.db);
        this._databaseGroupRepository = new DatabaseGroupRepository(this.db);
        this._syncRunLogsRepository = new SyncRunLogsRepository(this.db);
        this._schemaSnapshotRepository = new SchemaSnapshotRepository(this.db);
        this._auditLogRepository = new AuditLogRepository(this.db);
        this._backupRepository = new BackupRepository(this.db.db);
        this._backupLogsRepository = new BackupLogsRepository(this.db.db);

        this.logger.log(`📦 Metadata database initialized at ${dbPath}`);
    }

    onModuleDestroy() {
        this.db?.close();
    }

    get connectionRepository(): ConnectionRepository {
        return this._connectionRepository;
    }

    get queryLogsRepository(): QueryLogsRepository {
        return this._queryLogsRepository;
    }

    get migrationLogsRepository(): MigrationLogsRepository {
        return this._migrationLogsRepository;
    }

    get projectRepository(): ProjectRepository {
        return this._projectRepository;
    }

    get databaseGroupRepository(): DatabaseGroupRepository {
        return this._databaseGroupRepository;
    }

    get syncRunLogsRepository(): SyncRunLogsRepository {
        return this._syncRunLogsRepository;
    }

    get schemaSnapshotRepository(): SchemaSnapshotRepository {
        return this._schemaSnapshotRepository;
    }

    get auditLogRepository(): AuditLogRepository {
        return this._auditLogRepository;
    }

    get backupRepository(): BackupRepository {
        return this._backupRepository;
    }

    get backupLogsRepository(): BackupLogsRepository {
        return this._backupLogsRepository;
    }

    get database(): MetadataDatabase {
        return this.db;
    }
}
