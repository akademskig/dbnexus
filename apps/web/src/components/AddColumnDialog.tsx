import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    InputLabel,
    MenuItem,
    Select,
    Switch,
    TextField,
    Autocomplete,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

export interface NewColumnState {
    name: string;
    dataType: string;
    nullable: boolean;
    isPrimaryKey: boolean;
    isForeignKey: boolean;
    foreignKeyTable: string;
    foreignKeyColumn: string;
    defaultValue: string;
}

interface AddColumnDialogProps {
    open: boolean;
    tableName: string | null;
    dataTypes: string[];
    tables: { name: string }[];
    getColumnsForTable: (tableName: string) => { name: string }[];
    isSubmitting: boolean;
    newColumn: NewColumnState;
    setNewColumn: (updates: NewColumnState) => void;
    onClose: () => void;
    onSubmit: () => void;
}

export function AddColumnDialog({
    open,
    tableName,
    dataTypes,
    tables,
    getColumnsForTable,
    isSubmitting,
    newColumn,
    setNewColumn,
    onClose,
    onSubmit,
}: AddColumnDialogProps) {
    const fkTable = newColumn.foreignKeyTable;
    const fkColumns = fkTable ? getColumnsForTable(fkTable) : [];

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Add Column to {tableName ? `"${tableName}"` : 'table'}</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                    <TextField
                        autoFocus
                        label="Column Name"
                        fullWidth
                        value={newColumn.name}
                        onChange={(e) =>
                            setNewColumn({ ...newColumn, name: e.target.value })
                        }
                    />
                    <Autocomplete
                        freeSolo
                        options={dataTypes}
                        value={newColumn.dataType}
                        onChange={(_, value) =>
                            setNewColumn({ ...newColumn, dataType: value || '' })
                        }
                        onInputChange={(_, value) =>
                            setNewColumn({ ...newColumn, dataType: value })
                        }
                        renderInput={(params) => (
                            <TextField {...params} label="Data Type" fullWidth />
                        )}
                    />
                    <TextField
                        label="Default Value (optional)"
                        fullWidth
                        value={newColumn.defaultValue}
                        onChange={(e) =>
                            setNewColumn({ ...newColumn, defaultValue: e.target.value })
                        }
                        helperText="Enter SQL expression (e.g., 'now()', '0', 'true')"
                    />
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={newColumn.nullable}
                                    onChange={(e) =>
                                        setNewColumn({
                                            ...newColumn,
                                            nullable: e.target.checked,
                                        })
                                    }
                                />
                            }
                            label="Nullable"
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={newColumn.isPrimaryKey}
                                    onChange={(e) =>
                                        setNewColumn({
                                            ...newColumn,
                                            isPrimaryKey: e.target.checked,
                                        })
                                    }
                                />
                            }
                            label="Primary Key"
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={newColumn.isForeignKey}
                                    onChange={(e) =>
                                        setNewColumn({
                                            ...newColumn,
                                            isForeignKey: e.target.checked,
                                        })
                                    }
                                />
                            }
                            label="Foreign Key"
                        />
                    </Box>
                    {newColumn.isForeignKey && (
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <FormControl fullWidth>
                                <InputLabel>Reference Table</InputLabel>
                                <Select
                                    label="Reference Table"
                                    value={newColumn.foreignKeyTable}
                                    onChange={(e) =>
                                        setNewColumn({
                                            ...newColumn,
                                            foreignKeyTable: e.target.value,
                                            foreignKeyColumn: '',
                                        })
                                    }
                                >
                                    {tables.map((table) => (
                                        <MenuItem key={table.name} value={table.name}>
                                            {table.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl fullWidth disabled={!newColumn.foreignKeyTable}>
                                <InputLabel>Reference Column</InputLabel>
                                <Select
                                    label="Reference Column"
                                    value={newColumn.foreignKeyColumn}
                                    onChange={(e) =>
                                        setNewColumn({
                                            ...newColumn,
                                            foreignKeyColumn: e.target.value,
                                        })
                                    }
                                >
                                    {fkColumns.map((col: { name: string }) => (
                                        <MenuItem key={col.name} value={col.name}>
                                            {col.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    variant="contained"
                    onClick={onSubmit}
                    disabled={
                        !newColumn.name ||
                        !newColumn.dataType ||
                        isSubmitting ||
                        (newColumn.isForeignKey &&
                            (!newColumn.foreignKeyTable || !newColumn.foreignKeyColumn))
                    }
                    startIcon={isSubmitting ? <CircularProgress size={16} /> : <AddIcon />}
                >
                    Add Column
                </Button>
            </DialogActions>
        </Dialog>
    );
}
