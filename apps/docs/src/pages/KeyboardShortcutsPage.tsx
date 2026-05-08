import styled from '@emotion/styled';
import { motion } from 'framer-motion';
import { DocsLayout } from '../components/DocsLayout';

const Title = styled.h1`
    font-size: 3rem;
    font-weight: 800;
    margin-bottom: 1rem;
`;

const Subtitle = styled.p`
    color: var(--color-text);
    font-size: 1.25rem;
    margin-bottom: 2rem;
`;

const Section = styled.section`
    margin-bottom: 2.5rem;
`;

const SectionTitle = styled.h2`
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 1rem;
    color: var(--color-text);

    .material-symbols-outlined {
        font-size: 1.75rem;
    }
`;

const ShortcutGrid = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
`;

const ShortcutRow = styled(motion.div)`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: var(--color-bg-secondary);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 8px;

    &:hover {
        border-color: rgba(255, 255, 255, 0.1);
    }
`;

const ShortcutDescription = styled.span`
    color: var(--color-text);
    font-size: 0.95rem;
`;

const KeyCombo = styled.div`
    display: flex;
    gap: 0.25rem;
`;

const Key = styled.kbd`
    background: var(--color-bg-tertiary);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-bottom-width: 2px;
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    min-width: 2rem;
    text-align: center;
    color: var(--color-text);
`;

const shortcuts = {
    global: [
        { keys: ['?'], description: 'Show keyboard shortcuts overlay' },
        { keys: ['Escape'], description: 'Close dialogs / Cancel' },
    ],
    navigation: [
        { keys: ['Ctrl', '1'], description: 'Go to Dashboard' },
        { keys: ['Ctrl', '2'], description: 'Go to Query' },
        { keys: ['Ctrl', '3'], description: 'Go to Schema Diagram' },
        { keys: ['Ctrl', '4'], description: 'Go to Compare' },
        { keys: ['Ctrl', '5'], description: 'Go to Logs' },
        { keys: ['Ctrl', '6'], description: 'Go to Settings' },
    ],
    query: [
        { keys: ['Ctrl', 'Enter'], description: 'Execute query' },
        { keys: ['Ctrl', 'Shift', 'Enter'], description: 'Execute query (force dangerous)' },
        { keys: ['Ctrl', '/'], description: 'Toggle comment' },
        { keys: ['Ctrl', 'Shift', 'F'], description: 'Format SQL' },
        { keys: ['Ctrl', 'S'], description: 'Save query' },
        { keys: ['Ctrl', 'Space'], description: 'Trigger autocomplete' },
    ],
    dataGrid: [
        { keys: ['Enter'], description: 'Edit selected cell' },
        { keys: ['Ctrl', 'C'], description: 'Copy cell value' },
        { keys: ['Ctrl', 'A'], description: 'Select all rows' },
    ],
};

export function KeyboardShortcutsPage() {
    return (
        <DocsLayout>
            <Title>Keyboard Shortcuts</Title>
            <Subtitle>Master DB Nexus with these keyboard shortcuts.</Subtitle>

            <Section>
                <SectionTitle>
                    <span className="material-symbols-outlined">keyboard</span>
                    General
                </SectionTitle>
                <ShortcutGrid>
                    {shortcuts.global.map((shortcut, i) => (
                        <ShortcutRow
                            key={shortcut.description}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                        >
                            <ShortcutDescription>{shortcut.description}</ShortcutDescription>
                            <KeyCombo>
                                {shortcut.keys.map((key, j) => (
                                    <Key key={j}>{key}</Key>
                                ))}
                            </KeyCombo>
                        </ShortcutRow>
                    ))}
                </ShortcutGrid>
            </Section>

            <Section>
                <SectionTitle>
                    <span className="material-symbols-outlined">near_me</span>
                    Navigation
                </SectionTitle>
                <ShortcutGrid>
                    {shortcuts.navigation.map((shortcut, i) => (
                        <ShortcutRow
                            key={shortcut.description}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 + i * 0.03 }}
                        >
                            <ShortcutDescription>{shortcut.description}</ShortcutDescription>
                            <KeyCombo>
                                {shortcut.keys.map((key, j) => (
                                    <Key key={j}>{key}</Key>
                                ))}
                            </KeyCombo>
                        </ShortcutRow>
                    ))}
                </ShortcutGrid>
            </Section>

            <Section>
                <SectionTitle>
                    <span className="material-symbols-outlined">terminal</span>
                    Query Editor
                </SectionTitle>
                <ShortcutGrid>
                    {shortcuts.query.map((shortcut, i) => (
                        <ShortcutRow
                            key={shortcut.description}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + i * 0.03 }}
                        >
                            <ShortcutDescription>{shortcut.description}</ShortcutDescription>
                            <KeyCombo>
                                {shortcut.keys.map((key, j) => (
                                    <Key key={j}>{key}</Key>
                                ))}
                            </KeyCombo>
                        </ShortcutRow>
                    ))}
                </ShortcutGrid>
            </Section>

            <Section>
                <SectionTitle>
                    <span className="material-symbols-outlined">table_chart</span>
                    Data Grid
                </SectionTitle>
                <ShortcutGrid>
                    {shortcuts.dataGrid.map((shortcut, i) => (
                        <ShortcutRow
                            key={shortcut.description}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 + i * 0.03 }}
                        >
                            <ShortcutDescription>{shortcut.description}</ShortcutDescription>
                            <KeyCombo>
                                {shortcut.keys.map((key, j) => (
                                    <Key key={j}>{key}</Key>
                                ))}
                            </KeyCombo>
                        </ShortcutRow>
                    ))}
                </ShortcutGrid>
            </Section>
        </DocsLayout>
    );
}
