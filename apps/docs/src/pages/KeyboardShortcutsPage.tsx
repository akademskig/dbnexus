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
        { keys: ['Ctrl', 'K'], description: 'Open command palette' },
        { keys: ['Ctrl', '/'], description: 'Toggle sidebar' },
        { keys: ['Ctrl', ','], description: 'Open settings' },
        { keys: ['Ctrl', 'Shift', 'P'], description: 'Open projects' },
        { keys: ['Ctrl', 'Shift', 'Q'], description: 'Open query page' },
        { keys: ['Ctrl', 'Shift', 'D'], description: 'Open schema diagram' },
        { keys: ['Escape'], description: 'Close dialogs / Cancel' },
    ],
    query: [
        { keys: ['Ctrl', 'Enter'], description: 'Execute query' },
        { keys: ['Ctrl', 'Shift', 'Enter'], description: 'Execute selected text' },
        { keys: ['Ctrl', 'S'], description: 'Save query' },
        { keys: ['Ctrl', 'L'], description: 'Clear editor' },
        { keys: ['Ctrl', 'Space'], description: 'Trigger autocomplete' },
        { keys: ['Ctrl', 'F'], description: 'Find in editor' },
        { keys: ['Ctrl', 'H'], description: 'Find and replace' },
        { keys: ['Ctrl', 'Z'], description: 'Undo' },
        { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo' },
    ],
    dataGrid: [
        { keys: ['Enter'], description: 'Edit selected cell' },
        { keys: ['Escape'], description: 'Cancel editing' },
        { keys: ['Tab'], description: 'Move to next cell' },
        { keys: ['Shift', 'Tab'], description: 'Move to previous cell' },
        { keys: ['Ctrl', 'C'], description: 'Copy cell value' },
        { keys: ['Delete'], description: 'Delete selected rows' },
        { keys: ['Ctrl', 'A'], description: 'Select all rows' },
    ],
    diagram: [
        { keys: ['Ctrl', '+'], description: 'Zoom in' },
        { keys: ['Ctrl', '-'], description: 'Zoom out' },
        { keys: ['Ctrl', '0'], description: 'Reset zoom' },
        { keys: ['Ctrl', 'F'], description: 'Fit to screen' },
        { keys: ['Delete'], description: 'Delete selected table' },
        { keys: ['Escape'], description: 'Deselect all' },
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
                    Global
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
                    <span className="material-symbols-outlined">terminal</span>
                    Query Editor
                </SectionTitle>
                <ShortcutGrid>
                    {shortcuts.query.map((shortcut, i) => (
                        <ShortcutRow
                            key={shortcut.description}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 + i * 0.03 }}
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
                            transition={{ delay: 0.4 + i * 0.03 }}
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
                    <span className="material-symbols-outlined">schema</span>
                    Schema Diagram
                </SectionTitle>
                <ShortcutGrid>
                    {shortcuts.diagram.map((shortcut, i) => (
                        <ShortcutRow
                            key={shortcut.description}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.6 + i * 0.03 }}
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
