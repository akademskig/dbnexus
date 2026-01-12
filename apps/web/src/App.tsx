import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { ConnectionsPage } from './pages/ConnectionsPage';
import { QueryPage } from './pages/QueryPage';
import { SchemaPage } from './pages/SchemaPage';
import { SchemaDiffPage } from './pages/SchemaDiffPage';
import { GroupSyncPage } from './pages/GroupSyncPage';
import { SettingsPage } from './pages/SettingsPage';

function App() {
    return (
        <Routes>
            <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="connections" element={<ConnectionsPage />} />
                <Route path="query" element={<QueryPage />} />
                <Route path="query/:connectionId" element={<QueryPage />} />
                <Route path="schema/:connectionId" element={<SchemaPage />} />
                <Route path="schema-diff" element={<SchemaDiffPage />} />
                <Route path="groups/:groupId/sync" element={<GroupSyncPage />} />
                <Route path="settings" element={<SettingsPage />} />
            </Route>
        </Routes>
    );
}

export default App;
