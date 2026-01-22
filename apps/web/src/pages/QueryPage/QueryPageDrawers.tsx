import { Drawer } from '@mui/material';
import { HistoryPanel } from './HistoryPanel';
import { SavedQueriesPanel } from './SavedQueriesPanel';
import { TemplatesPanel } from './TemplatesPanel';
import type { TableInfo, TableSchema, SavedQuery, QueryHistoryEntry, ConnectionConfig } from '@dbnexus/shared';

interface QueryPageDrawersProps {
    // Templates
    templatesOpen: boolean;
    onTemplatesClose: () => void;
    onTemplateSelect: (sql: string) => void;
    selectedTable: TableInfo | null;
    tableSchema: TableSchema | undefined;
    engine: string | undefined;

    // History
    historyOpen: boolean;
    onHistoryClose: () => void;
    queryHistory: QueryHistoryEntry[];
    historyConnections: ConnectionConfig[];
    onHistorySelect: (entry: QueryHistoryEntry) => void;
    onHistoryRerun: (entry: QueryHistoryEntry) => void;
    onHistoryClear: () => void;
    onHistoryRefresh: () => void;
    historyClearing: boolean;

    // Saved Queries
    savedQueriesOpen: boolean;
    onSavedQueriesClose: () => void;
    savedQueries: SavedQuery[];
    savedQueryConnections: ConnectionConfig[];
    onSavedQuerySelect: (query: SavedQuery) => void;
    onSavedQueryRun: (query: SavedQuery) => void;
    onSavedQueryEdit: (query: SavedQuery) => void;
    onSavedQueryDelete: (query: SavedQuery) => void;
    onSavedQueriesRefresh: () => void;
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
