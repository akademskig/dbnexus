import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ConnectionManagementPage } from './pages/ConnectionManagementPage';
import { QueryPage } from './pages/QueryPage';
import { SchemaPage } from './pages/SchemaPage';
import { GroupSyncPage } from './pages/GroupSyncPage';
import { ComparePage } from './pages/ComparePage';
import { LogsPage } from './pages/LogsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { DiagramEditorPage } from './pages/DiagramEditorPage';
import { ServersPage } from './pages/ServersPage';
import { ServerManagementPage } from './pages/ServerManagementPage';

function App() {
    return (
        <Routes>
            {/* Public routes */}
            <Route path="/welcome" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Protected routes with layout */}
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <Layout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="servers" element={<ServersPage />} />
                <Route path="servers/:serverId" element={<ServerManagementPage />} />
                <Route path="projects" element={<ProjectsPage />} />
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
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
        </Routes>
    );
}

export default App;
