import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Check as CheckIcon,
    Close as CloseIcon,
    LightMode as LightModeIcon,
    DarkMode as DarkModeIcon,
    Keyboard as KeyboardIcon,
    Info as InfoIcon,
    Email as EmailIcon,
    School as SchoolIcon,
    Palette as PaletteIcon,
    Label as LabelIcon,
    ContentCopy as ContentCopyIcon,
} from '@mui/icons-material';
import { GlassCard } from '../components/GlassCard';
import { useTagsStore, TAG_COLORS, type Tag } from '../stores/tagsStore';
import { useThemeModeStore } from '../stores/themeModeStore';
import { useColorSchemeStore } from '../stores/colorSchemeStore';
import { colorSchemes, type ColorScheme } from '../theme';
import { KEYBOARD_SHORTCUTS, formatShortcut } from '../hooks/useKeyboardShortcuts';
import { ONBOARDING_STORAGE_KEY } from '../components/OnboardingTour';
import { useToastStore } from '../stores/toastStore';

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

// Color scheme labels
const colorSchemeLabels: Record<ColorScheme, string> = {
    teal: 'Teal',
    indigo: 'Indigo',
    violet: 'Violet',
    blue: 'Blue',
    emerald: 'Emerald',
    rose: 'Rose',
    lightblue: 'Light Blue',
    lime: 'Lime',
    orange: 'Orange',
};

// Appearance Tab Content
function AppearanceTab() {
    const { mode, toggleMode } = useThemeModeStore();
    const { colorScheme, setColorScheme } = useColorSchemeStore();

    return (
        <>
            <GlassCard sx={{ mb: 3 }}>
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
                                    bgcolor: 'primary.main',
                                    color: 'primary.contrastText',
                                    '&:hover': { bgcolor: 'primary.dark' },
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
                                    bgcolor: 'primary.main',
                                    color: 'primary.contrastText',
                                    '&:hover': { bgcolor: 'primary.dark' },
                                },
                            }}
                        >
                            <DarkModeIcon sx={{ mr: 1, fontSize: 18 }} />
                            Dark
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Box>
            </GlassCard>

            <GlassCard sx={{ mb: 3 }}>
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
                        Accent Color
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                        Choose your preferred color scheme
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 3 }}>
                    {(Object.keys(colorSchemes) as ColorScheme[]).map((scheme) => {
                        const colors = colorSchemes[scheme];
                        const isSelected = colorScheme === scheme;
                        return (
                            <Box
                                key={scheme}
                                onClick={() => setColorScheme(scheme)}
                                sx={{
                                    width: 72,
                                    height: 72,
                                    borderRadius: 1,
                                    bgcolor: isSelected ? `${colors.primary}20` : 'action.hover',
                                    border: 2,
                                    borderColor: isSelected ? colors.primary : 'transparent',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 0.5,
                                    transition: 'all 0.15s',
                                    '&:hover': {
                                        borderColor: colors.primary,
                                        bgcolor: `${colors.primary}15`,
                                    },
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: '50%',
                                        background: `linear-gradient(135deg, ${colors.primaryLight} 0%, ${colors.primary} 100%)`,
                                    }}
                                />
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: isSelected ? colors.primary : 'text.secondary',
                                        fontWeight: isSelected ? 600 : 400,
                                        fontSize: 11,
                                    }}
                                >
                                    {colorSchemeLabels[scheme]}
                                </Typography>
                            </Box>
                        );
                    })}
                </Box>
            </GlassCard>
        </>
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
                    borderRadius: '16px',
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
    const { tags, addTag, updateTag, deleteTag } = useTagsStore();
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
                    {!adding && (
                        <Button
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() => setAdding(true)}
                            sx={{
                                color: 'primary.main',
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
                                borderRadius: '16px',
                                fontWeight: 500,
                            }}
                        />
                    ))}
                </Box>
            </Box>
        </GlassCard>
    );
}

// About Tab Content
function AboutTab() {
    const version = __APP_VERSION__;
    const [donateDialogOpen, setDonateDialogOpen] = useState(false);
    const [addressCopied, setAddressCopied] = useState(false);
    const toastSuccess = useToastStore((state) => state.success);
    const toastError = useToastStore((state) => state.error);

    const DONATION_ADDRESS = 'bc1qhrg37apup3dkdmxmmy2kt0xcrufxjekxnd7x9jm3k0lv5lyzyrjqecryqh';
    const QR_CODE_URL = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=bitcoin:${DONATION_ADDRESS}`;

    const handleCopyAddress = async () => {
        try {
            await navigator.clipboard.writeText(DONATION_ADDRESS);
            setAddressCopied(true);
            toastSuccess('Bitcoin address copied to clipboard');
            setTimeout(() => setAddressCopied(false), 2000);
        } catch {
            toastError('Failed to copy address');
        }
    };

    return (
        <>
            {/* Description */}
            <GlassCard sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                    <InfoIcon sx={{ color: 'primary.main' }} />
                    <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
                        About DB Nexus
                    </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                    A <strong>local-first</strong> database management tool designed for speed,
                    safety, and clarity. DB Nexus brings together query editing, schema
                    visualization, data synchronization, and production safety guardrails in one
                    modern experience.
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                    Works seamlessly with <strong>PostgreSQL, MySQL, MariaDB, and SQLite</strong> —
                    everything runs locally, giving you full control over your data and
                    infrastructure.
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                    Built with React, TypeScript, NestJS, and Material-UI. Open source and designed
                    for database administrators and developers who value both power and usability.
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                    Version {version}
                </Typography>
            </GlassCard>

            {/* Contact */}
            <GlassCard sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600, mb: 2 }}>
                    Contact & Support
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                    For questions, feedback, or support:
                </Typography>
                <Button
                    variant="outlined"
                    startIcon={<EmailIcon />}
                    href="mailto:admin@dbnexus.dev"
                    sx={{
                        textTransform: 'none',
                        borderColor: 'divider',
                        color: 'text.primary',
                        '&:hover': {
                            borderColor: 'primary.main',
                            bgcolor: 'action.hover',
                        },
                    }}
                >
                    admin@dbnexus.dev
                </Button>
            </GlassCard>

            {/* Support Development */}
            <GlassCard sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600, mb: 2 }}>
                    Support Development
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                    If DB Nexus helps you, consider supporting its development.
                </Typography>
                <Button
                    variant="outlined"
                    startIcon={
                        <Box
                            component="img"
                            src="/Bitcoin.svg.webp"
                            alt="Bitcoin"
                            sx={{ width: 20, height: 20 }}
                        />
                    }
                    onClick={() => setDonateDialogOpen(true)}
                    sx={{
                        textTransform: 'none',
                        '&:hover': {
                            bgcolor: 'action.hover',
                            borderColor: 'primary.main',
                            color: 'primary.main',
                        },
                    }}
                >
                    Donate Bitcoin
                </Button>
            </GlassCard>

            {/* Resources */}
            <GlassCard sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600, mb: 2 }}>
                    Resources
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button
                        variant="outlined"
                        href="https://github.com/akademskig/dbnexus"
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                            textTransform: 'none',
                            '&:hover': { bgcolor: 'action.hover' },
                        }}
                    >
                        ⭐ Star on GitHub
                    </Button>
                    <Button
                        variant="outlined"
                        href="https://docs.dbnexus.dev"
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                            textTransform: 'none',
                            '&:hover': { bgcolor: 'action.hover' },
                        }}
                    >
                        Documentation
                    </Button>
                    <Button
                        variant="outlined"
                        href="https://github.com/akademskig/dbnexus/issues"
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                            textTransform: 'none',
                            '&:hover': { bgcolor: 'action.hover' },
                        }}
                    >
                        Report Issue
                    </Button>
                </Box>
            </GlassCard>

            {/* License */}
            <GlassCard>
                <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600, mb: 2 }}>
                    License & Credits
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                    DB Nexus is open source software.
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                    © {new Date().getFullYear()} DB Nexus. All rights reserved.
                </Typography>
            </GlassCard>

            {/* Bitcoin Donation Dialog */}
            <Dialog
                open={donateDialogOpen}
                onClose={() => setDonateDialogOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                            component="img"
                            src="/Bitcoin.svg.webp"
                            alt="Bitcoin"
                            sx={{ width: 28, height: 28 }}
                        />
                        <Typography variant="h6">Donate Bitcoin</Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 2,
                        }}
                    >
                        <Typography variant="body2" color="text.secondary" textAlign="center">
                            Support DB Nexus development
                        </Typography>

                        {/* QR Code */}
                        <Box
                            component="img"
                            src={QR_CODE_URL}
                            alt="Bitcoin QR Code"
                            sx={{
                                width: 200,
                                height: 200,
                                border: 1,
                                borderColor: 'divider',
                                borderRadius: 1,
                                p: 1,
                                bgcolor: 'white',
                            }}
                        />

                        {/* Address */}
                        <Box sx={{ width: '100%' }}>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: 'block', mb: 0.5 }}
                            >
                                Bitcoin Address:
                            </Typography>
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    p: 1.2,
                                    borderRadius: 1,
                                    border: 1.5,
                                    borderColor: 'divider',
                                    '&:hover': {
                                        borderColor: 'primary.main',
                                    },
                                }}
                            >
                                <Typography
                                    variant="body2"
                                    sx={{
                                        flex: 1,
                                        wordBreak: 'break-all',
                                        fontFamily: 'monospace',
                                        fontSize: 11,
                                    }}
                                >
                                    {DONATION_ADDRESS}
                                </Typography>
                                <IconButton
                                    size="small"
                                    onClick={handleCopyAddress}
                                    sx={{
                                        color: addressCopied ? 'success.main' : 'primary.main',
                                    }}
                                >
                                    {addressCopied ? <CheckIcon /> : <ContentCopyIcon />}
                                </IconButton>
                            </Box>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 2, pb: 2 }}>
                    <Button onClick={() => setDonateDialogOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </>
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
                sx={{
                    color: 'text.secondary',
                    mb: 1.5,
                    textTransform: 'uppercase',
                    fontSize: 11,
                    letterSpacing: '0.05em',
                }}
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
                                        {formatShortcut(shortcut)
                                            .split('+')
                                            .map((part, i) => (
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
                Use these keyboard shortcuts to navigate and work faster. On Mac, use ⌘ (Command)
                instead of Ctrl.
            </Typography>

            <ShortcutTable title="Query Editor" shortcuts={queryShortcuts} />
            <ShortcutTable title="Navigation" shortcuts={navigationShortcuts} />
            <ShortcutTable title="General" shortcuts={generalShortcuts} />
        </GlassCard>
    );
}

// Help Tab Content
function HelpTab() {
    const toast = useToastStore();

    const handleRestartTutorial = () => {
        localStorage.removeItem(ONBOARDING_STORAGE_KEY);
        localStorage.removeItem('dbnexus:onboarding:step');
        localStorage.removeItem('dbnexus:onboarding:minimized');
        toast.success('Tutorial reset! Redirecting to start...');
        // Navigate to projects page to start the tour
        globalThis.location.href = '/projects';
    };

    return (
        <GlassCard>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <SchoolIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
                    Tutorial
                </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                New to DB Nexus? The interactive tutorial will guide you through the main features
                and help you get started.
            </Typography>
            <Button
                variant="contained"
                startIcon={<SchoolIcon />}
                onClick={handleRestartTutorial}
                sx={{ textTransform: 'none' }}
            >
                Start Tutorial
            </Button>
        </GlassCard>
    );
}

// Main Settings Page
export function SettingsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [tab, setTab] = useState(0);

    // Sync tab with URL on mount
    useEffect(() => {
        const tabParam = searchParams.get('tab');
        if (tabParam === 'appearance') setTab(0);
        else if (tabParam === 'tags') setTab(1);
        else if (tabParam === 'shortcuts') setTab(2);
        else if (tabParam === 'help') setTab(3);
        else if (tabParam === 'about') setTab(4);
    }, [searchParams]);

    // Update URL when tab changes
    const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
        setTab(newValue);
        const tabNames = ['appearance', 'tags', 'shortcuts', 'help', 'about'];
        const tabName = tabNames[newValue];
        if (tabName) {
            setSearchParams({ tab: tabName });
        }
    };

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
                <GlassCard sx={{ mb: 3, p: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Tabs
                            value={tab}
                            onChange={handleTabChange}
                            sx={{
                                flex: 1,
                                px: 2,
                                '& .MuiTabs-indicator': {
                                    bgcolor: 'primary.main',
                                },
                                '& .MuiTab-root': {
                                    color: 'text.secondary',
                                    textTransform: 'none',
                                    fontWeight: 500,
                                    gap: 1,
                                    minHeight: 56,
                                    '&.Mui-selected': {
                                        color: 'primary.main',
                                    },
                                },
                            }}
                        >
                            <Tab
                                icon={<PaletteIcon fontSize="small" />}
                                iconPosition="start"
                                label="Appearance"
                            />
                            <Tab
                                icon={<LabelIcon fontSize="small" />}
                                iconPosition="start"
                                label="Tags"
                            />
                            <Tab
                                icon={<KeyboardIcon fontSize="small" />}
                                iconPosition="start"
                                label="Keyboard Shortcuts"
                            />
                            <Tab
                                icon={<SchoolIcon fontSize="small" />}
                                iconPosition="start"
                                label="Help"
                            />
                            <Tab
                                icon={<InfoIcon fontSize="small" />}
                                iconPosition="start"
                                label="About"
                            />
                        </Tabs>
                    </Box>
                </GlassCard>

                {/* Tab Content */}
                {tab === 0 && <AppearanceTab />}
                {tab === 1 && <TagsTab />}
                {tab === 2 && <KeyboardShortcutsTab />}
                {tab === 3 && <HelpTab />}
                {tab === 4 && <AboutTab />}
            </Box>
        </Box>
    );
}
