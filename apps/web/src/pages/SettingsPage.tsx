import { useState } from 'react';
import {
    Box,
    Typography,
    Button,
    ToggleButton,
    ToggleButtonGroup,
    Divider,
    Tabs,
    Tab,
    TextField,
    IconButton,
    Chip,
} from '@mui/material';
import {
    RestartAlt as ResetIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Check as CheckIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import { GlassCard, ACCENT_COLORS } from '../components/GlassCard';
import { useThemeStore } from '../stores/themeStore';
import { useTagsStore, TAG_COLORS, type Tag } from '../stores/tagsStore';

function ColorPicker({
    label,
    value,
    onChange,
    colors = ACCENT_COLORS,
}: {
    label: string;
    value: string;
    onChange: (color: string) => void;
    colors?: Record<string, string>;
}) {
    return (
        <Box>
            <Typography
                variant="caption"
                sx={{ color: 'rgba(255,255,255,0.5)', mb: 1, display: 'block' }}
            >
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

function OpacitySlider({
    label,
    value,
    onChange,
    max = 50,
    accentColor,
}: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    max?: number;
    accentColor: string;
}) {
    return (
        <Box sx={{ minWidth: 140 }}>
            <Typography
                variant="caption"
                sx={{ color: 'rgba(255,255,255,0.5)', mb: 0.5, display: 'block' }}
            >
                {label}: {(value * 100).toFixed(0)}%
            </Typography>
            <input
                type="range"
                min="0"
                max={max}
                value={value * 100}
                onChange={(e) => onChange(Number(e.target.value) / 100)}
                style={{ width: '100%', accentColor: `rgb(${accentColor})` }}
            />
        </Box>
    );
}

// Appearance Tab Content
function AppearanceTab() {
    const { style, setStyle, resetStyle } = useThemeStore();

    return (
        <>
            <GlassCard>
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 3,
                    }}
                >
                    <Typography variant="h6" sx={{ color: '#e4e4e7', fontWeight: 600 }}>
                        Card Style
                    </Typography>
                    <Button
                        size="small"
                        startIcon={<ResetIcon />}
                        onClick={resetStyle}
                        sx={{
                            color: 'rgba(255,255,255,0.5)',
                            textTransform: 'none',
                            '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.05)' },
                        }}
                    >
                        Reset to defaults
                    </Button>
                </Box>

                {/* Background */}
                <Typography variant="subtitle2" sx={{ color: '#e4e4e7', mb: 2 }}>
                    Background
                </Typography>
                <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', mb: 3 }}>
                    <ColorPicker
                        label="Color"
                        value={style.bgColor}
                        onChange={(bgColor) => setStyle({ bgColor })}
                    />
                    <OpacitySlider
                        label="Opacity"
                        value={style.bgOpacity}
                        onChange={(bgOpacity) => setStyle({ bgOpacity })}
                        max={30}
                        accentColor={style.bgColor}
                    />
                </Box>

                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: 3 }} />

                {/* Border */}
                <Typography variant="subtitle2" sx={{ color: '#e4e4e7', mb: 2 }}>
                    Border
                </Typography>
                <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', mb: 3 }}>
                    <ColorPicker
                        label="Color"
                        value={style.borderColor}
                        onChange={(borderColor) => setStyle({ borderColor })}
                    />
                    <OpacitySlider
                        label="Opacity"
                        value={style.borderOpacity}
                        onChange={(borderOpacity) => setStyle({ borderOpacity })}
                        max={50}
                        accentColor={style.borderColor}
                    />
                </Box>

                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: 3 }} />

                {/* Hover Border */}
                <Typography variant="subtitle2" sx={{ color: '#e4e4e7', mb: 2 }}>
                    Border on Hover
                </Typography>
                <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <ColorPicker
                        label="Color"
                        value={style.hoverBorderColor}
                        onChange={(hoverBorderColor) => setStyle({ hoverBorderColor })}
                    />
                    <OpacitySlider
                        label="Opacity"
                        value={style.hoverBorderOpacity}
                        onChange={(hoverBorderOpacity) => setStyle({ hoverBorderOpacity })}
                        max={100}
                        accentColor={style.hoverBorderColor}
                    />
                </Box>
            </GlassCard>

            {/* Preview */}
            <Box sx={{ mt: 4 }}>
                <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.5)', mb: 2 }}>
                    Preview (hover to see effect)
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <GlassCard>
                        <Typography variant="body2" sx={{ color: '#e4e4e7' }}>
                            Sample Card
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            Hover over me to see the border effect
                        </Typography>
                    </GlassCard>
                    <GlassCard>
                        <Typography variant="body2" sx={{ color: '#e4e4e7' }}>
                            Another Card
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            Settings are persisted in localStorage
                        </Typography>
                    </GlassCard>
                </Box>
            </Box>
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
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                }}
            >
                <Box sx={{ flex: 1 }}>
                    <TextField
                        size="small"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Tag name"
                        autoFocus
                        sx={{
                            mb: 1.5,
                            '& .MuiOutlinedInput-root': {
                                bgcolor: 'rgba(0,0,0,0.2)',
                                '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                                '&.Mui-focused fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                            },
                            '& .MuiInputBase-input': { color: '#e4e4e7', fontSize: 14 },
                        }}
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
                        sx={{ color: '#22c55e', '&:hover': { bgcolor: 'rgba(34, 197, 94, 0.1)' } }}
                    >
                        <CheckIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={handleCancel}
                        sx={{ color: '#6b6b76', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}
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
                borderBottom: '1px solid rgba(255,255,255,0.1)',
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
                    color: '#6b6b76',
                    '&:hover': { color: '#e4e4e7', bgcolor: 'rgba(255,255,255,0.05)' },
                }}
            >
                <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
                size="small"
                onClick={onDelete}
                sx={{
                    color: '#6b6b76',
                    '&:hover': { color: '#ef4444', bgcolor: 'rgba(239, 68, 68, 0.1)' },
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
                <Typography variant="h6" sx={{ color: '#e4e4e7', fontWeight: 600 }}>
                    Connection Tags
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        size="small"
                        startIcon={<ResetIcon />}
                        onClick={resetTags}
                        sx={{
                            color: 'rgba(255,255,255,0.5)',
                            textTransform: 'none',
                            '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.05)' },
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
                                color: '#22c55e',
                                textTransform: 'none',
                                '&:hover': { bgcolor: 'rgba(34, 197, 94, 0.1)' },
                            }}
                        >
                            Add tag
                        </Button>
                    )}
                </Box>
            </Box>

            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mb: 3 }}>
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
                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                        bgcolor: 'rgba(34, 197, 94, 0.05)',
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
                            sx={{
                                mb: 1.5,
                                '& .MuiOutlinedInput-root': {
                                    bgcolor: 'rgba(0,0,0,0.2)',
                                    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                                    '&.Mui-focused fieldset': {
                                        borderColor: 'rgba(34, 197, 94, 0.5)',
                                    },
                                },
                                '& .MuiInputBase-input': { color: '#e4e4e7', fontSize: 14 },
                            }}
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
                                color: '#22c55e',
                                '&:hover': { bgcolor: 'rgba(34, 197, 94, 0.1)' },
                            }}
                        >
                            <CheckIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                            size="small"
                            onClick={handleCancel}
                            sx={{
                                color: '#6b6b76',
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
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
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
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

// Main Settings Page
export function SettingsPage() {
    const [tab, setTab] = useState(0);

    return (
        <Box
            sx={{
                minHeight: '100vh',
                background: 'linear-gradient(180deg, #0a0a0f 0%, #12121a 50%, #0a0a0f 100%)',
                p: 4,
            }}
        >
            <Box sx={{ maxWidth: 800, mx: 'auto' }}>
                {/* Header */}
                <Box sx={{ mb: 4 }}>
                    <Typography
                        variant="h4"
                        sx={{
                            fontWeight: 600,
                            color: '#e4e4e7',
                            letterSpacing: '-0.02em',
                            mb: 1,
                        }}
                    >
                        Settings
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                        Customize the appearance and manage tags
                    </Typography>
                </Box>

                {/* Tabs */}
                <Tabs
                    value={tab}
                    onChange={(_, v) => setTab(v)}
                    sx={{
                        mb: 3,
                        '& .MuiTabs-indicator': {
                            bgcolor: '#e4e4e7',
                        },
                        '& .MuiTab-root': {
                            color: 'rgba(255,255,255,0.5)',
                            textTransform: 'none',
                            fontWeight: 500,
                            '&.Mui-selected': {
                                color: '#e4e4e7',
                            },
                        },
                    }}
                >
                    <Tab label="Appearance" />
                    <Tab label="Tags" />
                </Tabs>

                {/* Tab Content */}
                {tab === 0 && <AppearanceTab />}
                {tab === 1 && <TagsTab />}
            </Box>
        </Box>
    );
}
