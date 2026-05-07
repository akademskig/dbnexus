import { useEffect, useState } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    InputLabel,
    MenuItem,
    Radio,
    RadioGroup,
    Select,
    TextField,
    Typography,
    Checkbox,
} from '@mui/material';
import { StatusAlert } from './StatusAlert';

export interface InstallBackupToolsPayload {
    mode: 'install' | 'upgrade_latest';
    includePostgresqlTools: boolean;
    includeMysqlTools: boolean;
    postgresqlClientMajor?: number;
    mysqlClientPackage: 'default' | '8.0';
    sudoPassword?: string;
}

interface InstallBackupToolsDialogProps {
    readonly open: boolean;
    readonly onClose: () => void;
    readonly onConfirm: (payload: InstallBackupToolsPayload) => void;
    readonly isPending: boolean;
    /** Shown in helper text (e.g. "Ubuntu/Debian", "macOS"). */
    readonly platformLabel?: string;
    /** When opening from an "update tools" entry point. */
    readonly initialMode?: 'install' | 'upgrade_latest';
}

const POSTGRES_MAJORS = [18, 17, 16, 15, 14, 13, 12] as const;

export function InstallBackupToolsDialog({
    open,
    onClose,
    onConfirm,
    isPending,
    platformLabel,
    initialMode = 'install',
}: InstallBackupToolsDialogProps) {
    const [mode, setMode] = useState<'install' | 'upgrade_latest'>('install');
    const [includePg, setIncludePg] = useState(true);
    const [includeMysql, setIncludeMysql] = useState(true);
    const [pgMajor, setPgMajor] = useState<string>('');
    const [mysqlPkg, setMysqlPkg] = useState<'default' | '8.0'>('default');
    const [sudoPassword, setSudoPassword] = useState('');

    useEffect(() => {
        if (!open) {
            return;
        }
        setMode(initialMode);
        setIncludePg(true);
        setIncludeMysql(true);
        setPgMajor('');
        setMysqlPkg('default');
        setSudoPassword('');
    }, [open, initialMode]);

    const canSubmit = includePg || includeMysql;

    const handleConfirm = () => {
        if (!canSubmit) {
            return;
        }
        onConfirm({
            mode,
            includePostgresqlTools: includePg,
            includeMysqlTools: includeMysql,
            postgresqlClientMajor:
                includePg && pgMajor !== '' ? Number.parseInt(pgMajor, 10) : undefined,
            mysqlClientPackage: mysqlPkg,
            sudoPassword: sudoPassword.trim() === '' ? undefined : sudoPassword,
        });
    };

    let confirmLabel = 'Install';
    if (mode === 'upgrade_latest') {
        confirmLabel = isPending ? 'Upgrading…' : 'Upgrade';
    } else if (isPending) {
        confirmLabel = 'Installing…';
    }

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Database client tools</DialogTitle>
            <DialogContent>
                <StatusAlert severity="warning" sx={{ mb: 2 }}>
                    Linux package steps use sudo on the API host. If sudo is not passwordless, you
                    can enter your password below: it is sent once over HTTPS to run sudo -S (stdin)
                    and is not stored. For production, prefer sudoers NOPASSWD for these package
                    commands instead of sending passwords through the app.
                </StatusAlert>
                <StatusAlert severity="info" sx={{ mb: 2 }}>
                    PostgreSQL installs pg_dump and psql from the same client package. MySQL
                    installs mysqldump and mysql together. macOS/Homebrew does not use sudo; the
                    password field is ignored there.
                </StatusAlert>

                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                    Action
                </Typography>
                <RadioGroup
                    value={mode}
                    onChange={(e) => setMode(e.target.value as 'install' | 'upgrade_latest')}
                >
                    <FormControlLabel
                        value="install"
                        control={<Radio size="small" />}
                        label={
                            <Box>
                                <Typography variant="body2">Install packages</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    First-time install or add missing clients.
                                </Typography>
                            </Box>
                        }
                    />
                    <FormControlLabel
                        value="upgrade_latest"
                        control={<Radio size="small" />}
                        label={
                            <Box>
                                <Typography variant="body2">
                                    Upgrade to latest in repositories
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Refreshes indexes and upgrades selected stacks (apt, dnf,
                                    pacman, or Homebrew).
                                </Typography>
                            </Box>
                        }
                    />
                </RadioGroup>

                <Typography variant="subtitle2" fontWeight={600} sx={{ mt: 2, mb: 1 }}>
                    Which clients?
                </Typography>
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={includePg}
                            onChange={(_, c) => setIncludePg(c)}
                            size="small"
                        />
                    }
                    label="PostgreSQL tools (pg_dump, psql)"
                />
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={includeMysql}
                            onChange={(_, c) => setIncludeMysql(c)}
                            size="small"
                        />
                    }
                    label="MySQL tools (mysqldump, mysql)"
                />

                <FormControl fullWidth size="small" sx={{ mt: 2 }} disabled={!includePg}>
                    <InputLabel id="install-pg-major-label">PostgreSQL client version</InputLabel>
                    <Select
                        labelId="install-pg-major-label"
                        label="PostgreSQL client version"
                        value={pgMajor}
                        onChange={(e) => setPgMajor(e.target.value)}
                    >
                        <MenuItem value="">
                            <em>Distro default (postgresql-client)</em>
                        </MenuItem>
                        {POSTGRES_MAJORS.map((n) => (
                            <MenuItem key={n} value={String(n)}>
                                {`PostgreSQL ${n} (apt: postgresql-client-${n}, Homebrew: postgresql@${n})`}
                            </MenuItem>
                        ))}
                    </Select>
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mt: 0.75, display: 'block' }}
                    >
                        Newer majors (especially 17–18) are often missing from default Debian/Ubuntu
                        repos; use Distro default or add the PostgreSQL PGDG apt repository first.
                    </Typography>
                </FormControl>

                <FormControl fullWidth size="small" sx={{ mt: 2 }} disabled={!includeMysql}>
                    <InputLabel id="install-mysql-pkg-label">MySQL client package (apt)</InputLabel>
                    <Select
                        labelId="install-mysql-pkg-label"
                        label="MySQL client package (apt)"
                        value={mysqlPkg}
                        onChange={(e) => setMysqlPkg(e.target.value as 'default' | '8.0')}
                    >
                        <MenuItem value="default">Default (mysql-client)</MenuItem>
                        <MenuItem value="8.0">
                            MySQL 8.0 line (mysql-client-8.0, where available)
                        </MenuItem>
                    </Select>
                </FormControl>

                <TextField
                    fullWidth
                    size="small"
                    type="password"
                    label="Sudo password (optional, Linux only)"
                    value={sudoPassword}
                    onChange={(e) => setSudoPassword(e.target.value)}
                    autoComplete="new-password"
                    sx={{ mt: 2 }}
                    helperText="Leave empty if sudo is passwordless (NOPASSWD) or you will run installs manually in a terminal."
                />

                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 1.5, display: 'block' }}
                >
                    {platformLabel ? `Platform hint: ${platformLabel}. ` : ''}
                    MySQL &quot;8.0&quot; maps to the Debian/Ubuntu package mysql-client-8.0 when
                    your repositories provide it. Fedora/Arch use default client packages; on macOS
                    pick Homebrew formulas manually if you need a specific MySQL series.
                </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 2, pb: 2 }}>
                <Button onClick={onClose} disabled={isPending}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={handleConfirm}
                    disabled={isPending || !canSubmit}
                >
                    {confirmLabel}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
