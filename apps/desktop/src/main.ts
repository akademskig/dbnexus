import { app, BrowserWindow, shell, Menu, dialog } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;
let apiProcess: ChildProcess | null = null;

const isDev = process.env.NODE_ENV === 'development';
const API_PORT = 3001;

// Start the API server
function startApiServer(): Promise<void> {
    return new Promise((resolve, reject) => {
        const apiPath = isDev
            ? path.join(__dirname, '..', '..', 'api', 'dist', 'main.js')
            : path.join(process.resourcesPath, 'api', 'main.js');

        // eslint-disable-next-line no-console
        console.log('Starting API server from:', apiPath);

        apiProcess = spawn('node', [apiPath], {
            env: {
                ...process.env,
                NODE_ENV: 'production',
                PORT: String(API_PORT),
                DBNEXUS_DATA_DIR: app.getPath('userData'),
            },
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        apiProcess.stdout?.on('data', (data) => {
            // eslint-disable-next-line no-console
            console.log(`API: ${data}`);
            if (data.toString().includes('running on')) {
                resolve();
            }
        });

        apiProcess.stderr?.on('data', (data) => {
            console.error(`API Error: ${data}`);
        });

        apiProcess.on('error', (err) => {
            console.error('Failed to start API:', err);
            reject(err);
        });

        apiProcess.on('exit', (code) => {
            // eslint-disable-next-line no-console
            console.log(`API process exited with code ${code}`);
            if (code !== 0 && code !== null) {
                reject(new Error(`API exited with code ${code}`));
            }
        });

        // Timeout after 30 seconds
        setTimeout(() => {
            resolve(); // Resolve anyway, the server might be ready
        }, 30000);
    });
}

// Stop the API server
function stopApiServer(): void {
    if (apiProcess) {
        apiProcess.kill();
        apiProcess = null;
    }
}

// Create the main window
function createWindow(): void {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        title: 'DB Nexus',
        icon: path.join(__dirname, '..', 'resources', 'icon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
        show: false,
        backgroundColor: '#1a1a2e',
    });

    // Load the app
    const startUrl = isDev ? 'http://localhost:5173' : `http://localhost:${API_PORT}`;

    mainWindow.loadURL(startUrl);

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
    });

    // Open external links in browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Create application menu
function createMenu(): void {
    const template: Electron.MenuItemConstructorOptions[] = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Connection',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        mainWindow?.webContents.send('menu:new-connection');
                    },
                },
                { type: 'separator' },
                { role: 'quit' },
            ],
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'selectAll' },
            ],
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' },
            ],
        },
        {
            label: 'Window',
            submenu: [{ role: 'minimize' }, { role: 'zoom' }, { role: 'close' }],
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'Documentation',
                    click: () => {
                        shell.openExternal('https://github.com/your-repo/dbnexus');
                    },
                },
                {
                    label: 'Report Issue',
                    click: () => {
                        shell.openExternal('https://github.com/your-repo/dbnexus/issues');
                    },
                },
                { type: 'separator' },
                {
                    label: 'About DB Nexus',
                    click: () => {
                        dialog.showMessageBox({
                            type: 'info',
                            title: 'About DB Nexus',
                            message: 'DB Nexus',
                            detail: `Version: ${app.getVersion()}\nA powerful database management tool.`,
                        });
                    },
                },
            ],
        },
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// App lifecycle
app.whenReady().then(async () => {
    createMenu();

    if (!isDev) {
        try {
            await startApiServer();
        } catch (err) {
            console.error('Failed to start API server:', err);
            dialog.showErrorBox(
                'Startup Error',
                'Failed to start the API server. Please try restarting the application.'
            );
        }
    }

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    stopApiServer();
});

app.on('quit', () => {
    stopApiServer();
});
