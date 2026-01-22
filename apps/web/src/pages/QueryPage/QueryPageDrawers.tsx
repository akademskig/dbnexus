import { Drawer } from '@mui/material';
import { HistoryPanel } from './HistoryPanel';
import { SavedQueriesPanel } from './SavedQueriesPanel';
import { TemplatesPanel } from './TemplatesPanel';
import type {
    TableInfo,
    TableSchema,
    SavedQuery,
    QueryHistoryEntry,
    ConnectionConfig,
} from '@dbnexus/shared';

interface QueryPageDrawersProps {
    // Templates
    readonly templatesOpen: boolean;
    readonly onTemplatesClose: () => void;
    readonly onTemplateSelect: (sql: string) => void;
    readonly selectedTable: TableInfo | null;
    readonly tableSchema: TableSchema | undefined;
    readonly engine: string | undefined;

    // History
    readonly historyOpen: boolean;
    readonly onHistoryClose: () => void;
    readonly queryHistory: QueryHistoryEntry[];
    readonly historyConnections: ConnectionConfig[];
    readonly onHistorySelect: (entry: QueryHistoryEntry) => void;
    readonly onHistoryRerun: (entry: QueryHistoryEntry) => void;
    readonly onHistoryClear: () => void;
    readonly onHistoryRefresh: () => void;
    readonly historyClearing: boolean;

    // Saved Queries
    readonly savedQueriesOpen: boolean;
    readonly onSavedQueriesClose: () => void;
    readonly savedQueries: SavedQuery[];
    readonly savedQueryConnections: ConnectionConfig[];
    readonly onSavedQuerySelect: (query: SavedQuery) => void;
    readonly onSavedQueryRun: (query: SavedQuery) => void;
    readonly onSavedQueryEdit: (query: SavedQuery) => void;
    readonly onSavedQueryDelete: (query: SavedQuery) => void;
    readonly onSavedQueriesRefresh: () => void;
}

export function QueryPageDrawers({
    templatesOpen,
    onTemplatesClose,
    onTemplateSelect,
    selectedTable,
    tableSchema,
    engine,
    historyOpen,
    onHistoryClose,
    queryHistory,
    historyConnections,
    onHistorySelect,
    onHistoryRerun,
    onHistoryClear,
    onHistoryRefresh,
    historyClearing,
    savedQueriesOpen,
    onSavedQueriesClose,
    savedQueries,
    savedQueryConnections,
    onSavedQuerySelect,
    onSavedQueryRun,
    onSavedQueryEdit,
    onSavedQueryDelete,
    onSavedQueriesRefresh,
}: QueryPageDrawersProps) {
    return (
        <>
            {/* Query Templates Drawer */}
            <Drawer
                anchor="right"
                open={templatesOpen}
                onClose={onTemplatesClose}
                PaperProps={{
                    sx: { width: 420, bgcolor: 'background.default' },
                }}
            >
                <TemplatesPanel
                    onTemplateSelect={onTemplateSelect}
                    selectedTable={selectedTable}
                    tableSchema={tableSchema}
                    engine={engine}
                />
            </Drawer>

            {/* Query History Drawer */}
            <Drawer
                anchor="right"
                open={historyOpen}
                onClose={onHistoryClose}
                PaperProps={{
                    sx: { width: 420, bgcolor: 'background.default' },
                }}
            >
                <HistoryPanel
                    history={queryHistory}
                    connections={historyConnections}
                    onSelect={onHistorySelect}
                    onRerun={onHistoryRerun}
                    onClear={onHistoryClear}
                    onClose={onHistoryClose}
                    onRefresh={onHistoryRefresh}
                    clearing={historyClearing}
                />
            </Drawer>

            {/* Saved Queries Drawer */}
            <Drawer
                anchor="right"
                open={savedQueriesOpen}
                onClose={onSavedQueriesClose}
                PaperProps={{
                    sx: { width: 420, bgcolor: 'background.default' },
                }}
            >
                <SavedQueriesPanel
                    queries={savedQueries}
                    connections={savedQueryConnections}
                    onSelect={onSavedQuerySelect}
                    onRun={onSavedQueryRun}
                    onEdit={onSavedQueryEdit}
                    onDelete={onSavedQueryDelete}
                    onClose={onSavedQueriesClose}
                    onRefresh={onSavedQueriesRefresh}
                />
            </Drawer>
        </>
    );
}
