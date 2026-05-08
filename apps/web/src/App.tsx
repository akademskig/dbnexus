import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ConnectionManagementPage } from './pages/ConnectionManagementPage';
import { DashboardPage } from './pages/DashboardPage';
import { QueryPage } from './pages/QueryPage';
import { SchemaPage } from './pages/SchemaPage';
import { GroupSyncPage } from './pages/GroupSyncPage';
import { ComparePage } from './pages/ComparePage';
import { LogsPage } from './pages/LogsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AccountPage } from './pages/AccountPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { DiagramEditorPage } from './pages/DiagramEditorPage';
import { ServerManagementPage } from './pages/ServerManagementPage';
import { ErrorPage } from './pages/ErrorPage';

function App() {
    return (
        <ErrorBoundary>
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
                    {/* Dashboard */}
                    <Route path="dashboard" element={<DashboardPage />} />
                    {/* Main workspace */}
                    <Route path="query" element={<QueryPage />} />
                    <Route path="query/:connectionId" element={<QueryPage />} />
                    {/* Server & Connection management */}
                    <Route path="servers/:serverId" element={<ServerManagementPage />} />
                    <Route
                        path="connections/:connectionId"
                        element={<ConnectionManagementPage />}
                    />
                    {/* Sync, Compare, Logs */}
                    <Route path="groups/:groupId/sync" element={<GroupSyncPage />} />
                    <Route path="compare" element={<ComparePage />} />
                    <Route path="logs" element={<LogsPage />} />
                    {/* Schema views */}
                    <Route path="schema/:connectionId" element={<SchemaPage />} />
                    <Route path="schema-diagram" element={<DiagramEditorPage />} />
                    {/* Settings & Account */}
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="account" element={<AccountPage />} />
                    {/* Legacy redirects */}
                    <Route
                        path="diagram-editor"
                        element={<Navigate to="/schema-diagram" replace />}
                    />
                </Route>

                {/* 404 catch-all */}
                <Route path="*" element={<ErrorPage type="404" />} />
            </Routes>
        </ErrorBoundary>
    );
}

export default App;
