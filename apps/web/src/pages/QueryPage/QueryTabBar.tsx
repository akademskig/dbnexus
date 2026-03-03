import { useState, useRef } from 'react';
import {
    Box,
    IconButton,
    Typography,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    TextField,
    alpha,
    useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CodeIcon from '@mui/icons-material/Code';
import { StyledTooltip } from '../../components/StyledTooltip';
import { useQueryTabsStore, type QueryTab } from '../../stores/queryTabsStore';

interface QueryTabBarProps {
    readonly connectionId?: string;
}

export function QueryTabBar({ connectionId }: QueryTabBarProps) {
    const theme = useTheme();
    const { tabs, activeTabId, addTab, removeTab, setActiveTab, renameTab, duplicateTab } =
        useQueryTabsStore();

    const [contextMenu, setContextMenu] = useState<{
        mouseX: number;
        mouseY: number;
        tabId: string;
    } | null>(null);
    const [editingTabId, setEditingTabId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const handleAddTab = () => {
        addTab(connectionId);
    };

    const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
        e.stopPropagation();
        removeTab(tabId);
    };

    const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
        e.preventDefault();
        setContextMenu({
            mouseX: e.clientX,
            mouseY: e.clientY,
            tabId,
        });
    };

    const handleCloseContextMenu = () => {
        setContextMenu(null);
    };

    const handleStartRename = (tab: QueryTab) => {
        setEditingTabId(tab.id);
        setEditingName(tab.name);
        handleCloseContextMenu();
        setTimeout(() => inputRef.current?.select(), 50);
    };

    const handleFinishRename = () => {
        if (editingTabId && editingName.trim()) {
            renameTab(editingTabId, editingName.trim());
        }
        setEditingTabId(null);
        setEditingName('');
    };

    const handleDuplicate = (tabId: string) => {
        duplicateTab(tabId);
        handleCloseContextMenu();
    };

    const contextTab = contextMenu ? tabs.find((t) => t.id === contextMenu.tabId) : null;

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                borderBottom: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
                minHeight: 36,
                px: 0.5,
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    flex: 1,
                    overflow: 'auto',
                    gap: 0.25,
                    '&::-webkit-scrollbar': { height: 4 },
                    '&::-webkit-scrollbar-thumb': {
                        bgcolor: 'action.disabled',
                        borderRadius: 2,
                    },
                }}
            >
                {tabs.map((tab) => (
                    <Box
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        onContextMenu={(e) => handleContextMenu(e, tab.id)}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            px: 1.5,
                            py: 0.75,
                            cursor: 'pointer',
                            borderRadius: '6px 6px 0 0',
                            bgcolor:
                                tab.id === activeTabId
                                    ? alpha(theme.palette.primary.main, 0.1)
                                    : 'transparent',
                            borderBottom:
                                tab.id === activeTabId
                                    ? `2px solid ${theme.palette.primary.main}`
                                    : '2px solid transparent',
                            '&:hover': {
                                bgcolor:
                                    tab.id === activeTabId
                                        ? alpha(theme.palette.primary.main, 0.15)
                                        : 'action.hover',
                            },
                            transition: 'background-color 0.15s, border-color 0.15s',
                            minWidth: 100,
                            maxWidth: 180,
                        }}
                    >
                        <CodeIcon
                            sx={{
                                fontSize: 14,
                                color: tab.id === activeTabId ? 'primary.main' : 'text.secondary',
                            }}
                        />
                        {editingTabId === tab.id ? (
                            <TextField
                                inputRef={inputRef}
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onBlur={handleFinishRename}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleFinishRename();
                                    if (e.key === 'Escape') {
                                        setEditingTabId(null);
                                        setEditingName('');
                                    }
                                }}
                                size="small"
                                variant="standard"
                                autoFocus
                                sx={{
                                    '& .MuiInputBase-input': {
                                        fontSize: 12,
                                        py: 0,
                                        px: 0.5,
                                    },
                                    '& .MuiInput-underline:before': {
                                        borderBottom: 'none',
                                    },
                                }}
                                onClick={(e) => e.stopPropagation()}
                            />
                        ) : (
                            <Typography
                                variant="body2"
                                sx={{
                                    fontSize: 12,
                                    fontWeight: tab.id === activeTabId ? 600 : 400,
                                    color:
                                        tab.id === activeTabId ? 'text.primary' : 'text.secondary',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    flex: 1,
                                }}
                                onDoubleClick={() => handleStartRename(tab)}
                            >
                                {tab.name}
                            </Typography>
                        )}
                        {tabs.length > 1 && (
                            <IconButton
                                size="small"
                                onClick={(e) => handleCloseTab(e, tab.id)}
                                sx={{
                                    p: 0.25,
                                    ml: 0.5,
                                    opacity: tab.id === activeTabId ? 0.7 : 0,
                                    '&:hover': { opacity: 1 },
                                    transition: 'opacity 0.15s',
                                }}
                            >
                                <CloseIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                        )}
                    </Box>
                ))}
            </Box>

            <StyledTooltip title="New Query Tab">
                <IconButton size="small" onClick={handleAddTab} sx={{ ml: 0.5 }}>
                    <AddIcon sx={{ fontSize: 18 }} />
                </IconButton>
            </StyledTooltip>

            <Menu
                open={contextMenu !== null}
                onClose={handleCloseContextMenu}
                anchorReference="anchorPosition"
                anchorPosition={
                    contextMenu !== null
                        ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
                        : undefined
                }
            >
                <MenuItem onClick={() => contextTab && handleStartRename(contextTab)} dense>
                    <ListItemIcon>
                        <EditIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Rename</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => contextMenu && handleDuplicate(contextMenu.tabId)} dense>
                    <ListItemIcon>
                        <ContentCopyIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Duplicate</ListItemText>
                </MenuItem>
                {tabs.length > 1 && (
                    <MenuItem
                        onClick={() => {
                            if (contextMenu) removeTab(contextMenu.tabId);
                            handleCloseContextMenu();
                        }}
                        dense
                    >
                        <ListItemIcon>
                            <CloseIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Close</ListItemText>
                    </MenuItem>
                )}
            </Menu>
        </Box>
    );
}
