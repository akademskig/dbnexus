import type { ReactNode } from 'react';
import {
    Alert,
    Autocomplete,
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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';

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

interface ColumnDialogProps extends AddColumnDialogProps {
    title: string;
    submitLabel: string;
    submitIcon: ReactNode;
    nameFieldDisabled?: boolean;
    notice?: ReactNode;
    defaultValueLabel?: string;
    defaultValueHelperText?: string;
    defaultValuePlaceholder?: string;
}

function ColumnDialog({
    open,
    dataTypes,
    tables,
    getColumnsForTable,
    isSubmitting,
    newColumn,
    setNewColumn,
    onClose,
    onSubmit,
    title,
    submitLabel,
    submitIcon,
    nameFieldDisabled,
    notice,
    defaultValueLabel = 'Default Value (optional)',
    defaultValueHelperText = "Enter SQL expression (e.g., 'now()', '0', 'true')",
    defaultValuePlaceholder,
}: Readonly<ColumnDialogProps>) {
    const fkTable = newColumn.foreignKeyTable;
    const fkColumns = fkTable ? getColumnsForTable(fkTable) : [];

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                    {notice ? <Alert severity="info">{notice}</Alert> : null}
                    <TextField
                        autoFocus={!nameFieldDisabled}
                        label="Column Name"
                        fullWidth
                        value={newColumn.name}
                        onChange={(e) => setNewColumn({ ...newColumn, name: e.target.value })}
                        disabled={nameFieldDisabled}
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
                        label={defaultValueLabel}
                        fullWidth
                        value={newColumn.defaultValue}
                        onChange={(e) =>
                            setNewColumn({ ...newColumn, defaultValue: e.target.value })
                        }
                        helperText={defaultValueHelperText}
                        placeholder={defaultValuePlaceholder}
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
            <DialogActions sx={{ p: 2 }}>
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
                    startIcon={submitIcon}
                >
                    {submitLabel}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export function AddColumnDialog(props: Readonly<AddColumnDialogProps>) {
    const submitIcon = props.isSubmitting ? <CircularProgress size={16} /> : <AddIcon />;
    const tableLabel = props.tableName ? `"${props.tableName}"` : 'table';
    return (
        <ColumnDialog
            {...props}
            title={`Add Column to ${tableLabel}`}
            submitLabel="Add Column"
            submitIcon={submitIcon}
        />
    );
}

export function EditColumnDialog(props: Readonly<AddColumnDialogProps>) {
    const submitIcon = props.isSubmitting ? <CircularProgress size={16} /> : <EditIcon />;
    const columnLabel = props.newColumn.name ? `"${props.newColumn.name}"` : '';
    return (
        <ColumnDialog
            {...props}
            title={`Edit Column ${columnLabel}`}
            submitLabel="Save Changes"
            submitIcon={submitIcon}
            nameFieldDisabled
            notice="Column name cannot be changed here. Use SQL to rename columns."
            defaultValueLabel="Default Value"
            defaultValueHelperText="Enter SQL expression for default value, or leave empty to drop default"
            defaultValuePlaceholder="NULL, 0, 'default', now()"
        />
    );
}
