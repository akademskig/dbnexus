import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { ConnectionManagementPage } from './pages/ConnectionManagementPage';
import { QueryPage } from './pages/QueryPage';
import { SchemaPage } from './pages/SchemaPage';
import { GroupSyncPage } from './pages/GroupSyncPage';
import { ComparePage } from './pages/ComparePage';
import { LogsPage } from './pages/LogsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LandingPage } from './pages/LandingPage';
import { DiagramEditorPage } from './pages/DiagramEditorPage';

function App() {
    return (
        <Routes>
            {/* Landing page without layout */}
            <Route path="/welcome" element={<LandingPage />} />

            {/* Main app with layout */}
            <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="connections/:connectionId" element={<ConnectionManagementPage />} />
                <Route path="query" element={<QueryPage />} />
                <Route path="query/:connectionId" element={<QueryPage />} />
                <Route path="schema/:connectionId" element={<SchemaPage />} />
                <Route path="groups/:groupId/sync" element={<GroupSyncPage />} />
                <Route path="compare" element={<ComparePage />} />
                <Route path="logs" element={<LogsPage />} />
                <Route path="schema-diagram" element={<DiagramEditorPage />} />
                <Route path="diagram-editor" element={<Navigate to="/schema-diagram" replace />} />
                <Route path="settings" element={<SettingsPage />} />
            </Route>
        </Routes>
    );
}

export default App;
