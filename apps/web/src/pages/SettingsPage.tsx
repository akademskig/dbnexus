import { useState } from 'react';
import {
    Box,
    Typography,
    Button,
    ToggleButton,
    ToggleButtonGroup,
    Tabs,
    Tab,
    TextField,
    IconButton,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from '@mui/material';
import {
    RestartAlt as ResetIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Check as CheckIcon,
    Close as CloseIcon,
    LightMode as LightModeIcon,
    DarkMode as DarkModeIcon,
    Keyboard as KeyboardIcon,
} from '@mui/icons-material';
import { GlassCard } from '../components/GlassCard';
import { useTagsStore, TAG_COLORS, type Tag } from '../stores/tagsStore';
import { useThemeModeStore } from '../stores/themeModeStore';
import { KEYBOARD_SHORTCUTS, formatShortcut } from '../hooks/useKeyboardShortcuts';

// Color picker for tag colors only
function ColorPicker({
    label,
    value,
    onChange,
    colors,
}: {
    label: string;
    value: string;
    onChange: (color: string) => void;
    colors: Record<string, string>;
}) {
    return (
        <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
                {label}
            </Typography>
            <ToggleButtonGroup
                value={value}
                exclusive
                onChange={(_, v) => v && onChange(v)}
                size="small"
                sx={{ gap: 0.5, flexWrap: 'wrap' }}
            >
                {Object.entries(colors).map(([name, rgb]) => (
                    <ToggleButton
                        key={name}
                        value={rgb}
                        title={name}
                        sx={{
                            width: 24,
                            height: 24,
                            borderRadius: 0.5,
                            bgcolor: `rgba(${rgb}, 0.4)`,
                            border: `1px solid rgba(${rgb}, 0.6)`,
                            '&.Mui-selected': {
                                bgcolor: `rgba(${rgb}, 0.6)`,
                                border: `2px solid rgba(${rgb}, 1)`,
                            },
                            '&:hover': {
                                bgcolor: `rgba(${rgb}, 0.5)`,
                            },
                        }}
                    />
                ))}
            </ToggleButtonGroup>
        </Box>
    );
}

// Appearance Tab Content
function AppearanceTab() {
    const { mode, toggleMode } = useThemeModeStore();

    return (
        <GlassCard>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                <Box>
                    <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
                        Theme
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                        Choose between light and dark mode
                    </Typography>
                </Box>
                <ToggleButtonGroup
                    value={mode}
                    exclusive
                    onChange={(_, v) => v && toggleMode()}
                    size="small"
                >
                    <ToggleButton
                        value="light"
                        sx={{
                            px: 2,
                            '&.Mui-selected': {
                                bgcolor: 'rgba(255, 193, 7, 0.15)',
                                color: '#fbbf24',
                                '&:hover': { bgcolor: 'rgba(255, 193, 7, 0.25)' },
                            },
                        }}
                    >
                        <LightModeIcon sx={{ mr: 1, fontSize: 18 }} />
                        Light
                    </ToggleButton>
                    <ToggleButton
                        value="dark"
                        sx={{
                            px: 2,
                            '&.Mui-selected': {
                                bgcolor: 'rgba(99, 102, 241, 0.15)',
                                color: '#818cf8',
                                '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.25)' },
                            },
                        }}
                    >
                        <DarkModeIcon sx={{ mr: 1, fontSize: 18 }} />
                        Dark
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>
        </GlassCard>
    );
}

// Tag Editor Row
function TagRow({
    tag,
    onUpdate,
    onDelete,
}: {
    tag: Tag;
    onUpdate: (updates: Partial<Omit<Tag, 'id'>>) => void;
    onDelete: () => void;
}) {
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState(tag.name);
    const [editColor, setEditColor] = useState(tag.color);

    const handleSave = () => {
        if (editName.trim()) {
            onUpdate({ name: editName.trim(), color: editColor });
            setEditing(false);
        }
    };

    const handleCancel = () => {
        setEditName(tag.name);
        setEditColor(tag.color);
        setEditing(false);
    };

    if (editing) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 2,
                    py: 2,
                    borderBottom: 1,
                    borderColor: 'divider',
                }}
            >
                <Box sx={{ flex: 1 }}>
                    <TextField
                        size="small"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Tag name"
                        autoFocus
                        sx={{ mb: 1.5 }}
                        fullWidth
                    />
                    <ColorPicker
                        label="Color"
                        value={editColor}
                        onChange={setEditColor}
                        colors={TAG_COLORS}
                    />
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, pt: 0.5 }}>
                    <IconButton
                        size="small"
                        onClick={handleSave}
                        sx={{ color: 'success.main', '&:hover': { bgcolor: 'action.hover' } }}
                    >
                        <CheckIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={handleCancel}
                        sx={{ color: 'text.secondary', '&:hover': { bgcolor: 'action.hover' } }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                py: 1.5,
                borderBottom: 1,
                borderColor: 'divider',
            }}
        >
            <Chip
                label={tag.name}
                size="small"
                sx={{
                    bgcolor: `rgba(${tag.color}, 0.15)`,
                    color: `rgb(${tag.color})`,
                    border: `1px solid rgba(${tag.color}, 0.3)`,
                    borderRadius: 0.5,
                    fontWeight: 500,
                }}
            />
            <Box sx={{ flex: 1 }} />
            <IconButton
                size="small"
                onClick={() => setEditing(true)}
                sx={{
                    color: 'text.secondary',
                    '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
                }}
            >
                <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
                size="small"
                onClick={onDelete}
                sx={{
                    color: 'text.secondary',
                    '&:hover': { color: 'error.main', bgcolor: 'action.hover' },
                }}
            >
                <DeleteIcon fontSize="small" />
            </IconButton>
        </Box>
    );
}

// Tags Tab Content
function TagsTab() {
    const { tags, addTag, updateTag, deleteTag, resetTags } = useTagsStore();
    const [adding, setAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [newColor, setNewColor] = useState(TAG_COLORS.blue);

    const handleAdd = () => {
        if (newName.trim()) {
            addTag({ name: newName.trim(), color: newColor });
            setNewName('');
            setNewColor(TAG_COLORS.blue);
            setAdding(false);
        }
    };

    const handleCancel = () => {
        setNewName('');
        setNewColor(TAG_COLORS.blue);
        setAdding(false);
    };

    return (
        <GlassCard>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 3,
                }}
            >
                <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
                    Connection Tags
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        size="small"
                        startIcon={<ResetIcon />}
                        onClick={resetTags}
                        sx={{
                            color: 'text.secondary',
                            textTransform: 'none',
                            '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
                        }}
                    >
                        Reset
                    </Button>
                    {!adding && (
                        <Button
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() => setAdding(true)}
                            sx={{
                                color: 'success.main',
                                textTransform: 'none',
                                '&:hover': { bgcolor: 'action.hover' },
                            }}
                        >
                            Add tag
                        </Button>
                    )}
                </Box>
            </Box>

            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                Tags help you organize and categorize your database connections.
            </Typography>

            {/* Add new tag form */}
            {adding && (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 2,
                        py: 2,
                        mb: 2,
                        borderBottom: 1,
                        borderColor: 'divider',
                        bgcolor: (theme) =>
                            theme.palette.mode === 'dark'
                                ? 'rgba(34, 197, 94, 0.05)'
                                : 'rgba(34, 197, 94, 0.08)',
                        mx: -2.5,
                        px: 2.5,
                    }}
                >
                    <Box sx={{ flex: 1 }}>
                        <TextField
                            size="small"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="New tag name"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAdd();
                                if (e.key === 'Escape') handleCancel();
                            }}
                            sx={{ mb: 1.5 }}
                            fullWidth
                        />
                        <ColorPicker
                            label="Color"
                            value={newColor}
                            onChange={setNewColor}
                            colors={TAG_COLORS}
                        />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5, pt: 0.5 }}>
                        <IconButton
                            size="small"
                            onClick={handleAdd}
                            disabled={!newName.trim()}
                            sx={{
                                color: 'success.main',
                                '&:hover': { bgcolor: 'action.hover' },
                            }}
                        >
                            <CheckIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                            size="small"
                            onClick={handleCancel}
                            sx={{
                                color: 'text.secondary',
                                '&:hover': { bgcolor: 'action.hover' },
                            }}
                        >
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Box>
                </Box>
            )}

            {/* Tags list */}
            {tags.length === 0 ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        No tags yet. Add your first tag to get started.
                    </Typography>
                </Box>
            ) : (
                <Box>
                    {tags.map((tag) => (
                        <TagRow
                            key={tag.id}
                            tag={tag}
                            onUpdate={(updates) => updateTag(tag.id, updates)}
                            onDelete={() => deleteTag(tag.id)}
                        />
                    ))}
                </Box>
            )}

            {/* Preview */}
            <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.5)', mb: 2 }}>
                    Preview
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {tags.map((tag) => (
                        <Chip
                            key={tag.id}
                            label={tag.name}
                            size="small"
                            sx={{
                                bgcolor: `rgba(${tag.color}, 0.15)`,
                                color: `rgb(${tag.color})`,
                                border: `1px solid rgba(${tag.color}, 0.3)`,
                                borderRadius: 0.5,
                                fontWeight: 500,
                            }}
                        />
                    ))}
                </Box>
            </Box>
        </GlassCard>
    );
}

// Keyboard Shortcuts Tab Content
function KeyboardShortcutsTab() {
    const queryShortcuts = KEYBOARD_SHORTCUTS.filter((s) => s.category === 'query');
    const navigationShortcuts = KEYBOARD_SHORTCUTS.filter((s) => s.category === 'navigation');
    const generalShortcuts = KEYBOARD_SHORTCUTS.filter((s) => s.category === 'general');

    const ShortcutTable = ({
        title,
        shortcuts,
    }: {
        title: string;
        shortcuts: typeof KEYBOARD_SHORTCUTS;
    }) => (
        <Box sx={{ mb: 4 }}>
            <Typography
                variant="subtitle2"
                sx={{ color: 'text.secondary', mb: 1.5, textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.05em' }}
            >
                {title}
            </Typography>
            <TableContainer>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600, width: 150 }}>Shortcut</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {shortcuts.map((shortcut, index) => (
                            <TableRow key={index} sx={{ '&:last-child td': { borderBottom: 0 } }}>
                                <TableCell>
                                    <Box
                                        sx={{
                                            display: 'inline-flex',
                                            gap: 0.5,
                                            fontFamily: 'monospace',
                                            fontSize: 12,
                                        }}
                                    >
                                        {formatShortcut(shortcut).split('+').map((part, i) => (
                                            <Box
                                                key={i}
                                                component="kbd"
                                                sx={{
                                                    px: 1,
                                                    py: 0.25,
                                                    bgcolor: 'action.hover',
                                                    border: 1,
                                                    borderColor: 'divider',
                                                    borderRadius: 0.5,
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    minWidth: 24,
                                                    textAlign: 'center',
                                                }}
                                            >
                                                {part}
                                            </Box>
                                        ))}
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2">{shortcut.description}</Typography>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );

    return (
        <GlassCard>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <KeyboardIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
                    Keyboard Shortcuts
                </Typography>
            </Box>

            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4 }}>
                Use these keyboard shortcuts to navigate and work faster. On Mac, use ⌘ (Command) instead of Ctrl.
            </Typography>

            <ShortcutTable title="Query Editor" shortcuts={queryShortcuts} />
            <ShortcutTable title="Navigation" shortcuts={navigationShortcuts} />
            <ShortcutTable title="General" shortcuts={generalShortcuts} />
        </GlassCard>
    );
}

// Main Settings Page
export function SettingsPage() {
    const [tab, setTab] = useState(0);

    return (
        <Box sx={{ p: 4, maxWidth: 1400, mx: 'auto' }}>
            <Box sx={{ maxWidth: 800, mx: 'auto' }}>
                {/* Header */}
                <Box sx={{ mb: 4 }}>
                    <Typography
                        variant="h4"
                        sx={{
                            fontWeight: 600,
                            color: 'text.primary',
                            letterSpacing: '-0.02em',
                            mb: 1,
                        }}
                    >
                        Settings
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Customize the appearance and manage tags
                    </Typography>
                </Box>

                {/* Tabs */}
                <Tabs
                    value={tab}
                    onChange={(_, v) => setTab(v)}
                    sx={{
                        '& .MuiTabs-indicator': {
                            bgcolor: 'primary.main',
                        },
                        '& .MuiTab-root': {
                            color: 'text.secondary',
                            textTransform: 'none',
                            fontWeight: 500,
                            '&.Mui-selected': {
                                color: 'primary.main',
                            },
                        },
                    }}
                >
                    <Tab label="Appearance" />
                    <Tab label="Tags" />
                    <Tab label="Keyboard Shortcuts" />
                </Tabs>

                {/* Tab Content */}
                {tab === 0 && <AppearanceTab />}
                {tab === 1 && <TagsTab />}
                {tab === 2 && <KeyboardShortcutsTab />}
            </Box>
        </Box>
    );
}
