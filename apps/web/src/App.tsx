import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { ConnectionsPage } from './pages/ConnectionsPage';
import { QueryPage } from './pages/QueryPage';
import { SchemaPage } from './pages/SchemaPage';
import { SchemaDiffPage } from './pages/SchemaDiffPage';
import { ShowcasePage } from './pages/ShowcasePage';
import { ShowcasePage2 } from './pages/ShowcasePage2';
import { ShowcasePage3 } from './pages/ShowcasePage3';
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
                <Route path="showcase" element={<ShowcasePage />} />
                <Route path="showcase2" element={<ShowcasePage2 />} />
                <Route path="showcase3" element={<ShowcasePage3 />} />
                <Route path="settings" element={<SettingsPage />} />
            </Route>
        </Routes>
    );
}

export default App;
