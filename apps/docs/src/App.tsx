import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LandingPage } from './pages/LandingPage';
import { DocsPage } from './pages/DocsPage';
import { GettingStartedPage } from './pages/GettingStartedPage';
import { FeaturesPage } from './pages/FeaturesPage';
import { CLIReferencePage } from './pages/CLIReferencePage';
import { KeyboardShortcutsPage } from './pages/KeyboardShortcutsPage';
import { ChangelogPage } from './pages/ChangelogPage';

export default function App() {
    return (
        <Routes>
            <Route element={<Layout />}>
                <Route path="/" element={<LandingPage />} />
                <Route path="/docs" element={<DocsPage />} />
                <Route path="/docs/getting-started" element={<GettingStartedPage />} />
                <Route path="/docs/features" element={<FeaturesPage />} />
                <Route path="/docs/cli" element={<CLIReferencePage />} />
                <Route path="/docs/shortcuts" element={<KeyboardShortcutsPage />} />
                <Route path="/changelog" element={<ChangelogPage />} />
            </Route>
        </Routes>
    );
}
