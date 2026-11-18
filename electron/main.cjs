const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

if (process.platform === 'linux') {
  app.commandLine.appendSwitch('no-sandbox');
}

let mainWindow = null;

function getDataFilePath() {
  return path.join(app.getPath('userData'), 'printcost-cl-database.json');
}

function readDiskData() {
  try {
    const filePath = getDataFilePath();
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error leyendo archivo de datos local:', err);
    return null;
  }
}

function writeDiskData(data) {
  try {
    const filePath = getDataFilePath();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error guardando archivo de datos local:', err);
    return false;
  }
}

function setupAppMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about', label: 'Acerca de PrintCost CL' },
              { type: 'separator' },
              { role: 'hide', label: 'Ocultar' },
              { role: 'hideOthers', label: 'Ocultar otros' },
              { role: 'unhide', label: 'Mostrar todo' },
              { type: 'separator' },
              { role: 'quit', label: 'Salir de PrintCost CL' }
            ]
          }
        ]
      : []),
    {
      label: 'Archivo',
      submenu: [
        {
          label: 'Imprimir / Exportar Cotización',
          accelerator: 'CmdOrCtrl+P',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu:trigger-pdf');
            }
          }
        },
        { type: 'separator' },
        isMac ? { role: 'close', label: 'Cerrar ventana' } : { role: 'quit', label: 'Salir' }
      ]
    },
    {
      label: 'Edición',
      submenu: [
        { role: 'undo', label: 'Deshacer' },
        { role: 'redo', label: 'Rehacer' },
        { type: 'separator' },
        { role: 'cut', label: 'Cortar' },
        { role: 'copy', label: 'Copiar' },
        { role: 'paste', label: 'Pegar' },
        { role: 'selectAll', label: 'Seleccionar todo' }
      ]
    },
    {
      label: 'Vista',
      submenu: [
        { role: 'reload', label: 'Recargar' },
        { role: 'resetZoom', label: 'Tamaño real' },
        { role: 'zoomIn', label: 'Acercar' },
        { role: 'zoomOut', label: 'Alejar' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Pantalla completa' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 960,
    minHeight: 680,
    title: 'Sueños 3D — Calculadora de Precios Impresión 3D (CLP)',
    icon: path.join(__dirname, '../dist/logo-suenos-3d.png'),
    backgroundColor: '#0f172a',
    autoHideMenuBar: process.platform !== 'darwin',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers para almacenamiento nativo en disco (Linux, Windows, macOS)
ipcMain.handle('storage:load', async () => {
  return {
    data: readDiskData(),
    filePath: getDataFilePath(),
    platform: process.platform
  };
});

ipcMain.handle('storage:save', async (_event, payload) => {
  const ok = writeDiskData(payload);
  return { ok, filePath: getDataFilePath() };
});

// Exportar respaldo JSON con diálogo nativo del sistema operativo
ipcMain.handle('backup:export', async (_event, payload) => {
  if (!mainWindow) return { canceled: true };
  const defaultName = `Respaldo-PrintCost-CL-${new Date().toISOString().slice(0, 10)}.json`;
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Exportar configuraciones de Filamentos, Impresoras y Cotizaciones',
    defaultPath: defaultName,
    filters: [{ name: 'Archivo de Respaldo JSON', extensions: ['json'] }]
  });

  if (canceled || !filePath) return { canceled: true };
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
  return { canceled: false, filePath };
});

// Importar respaldo JSON con diálogo nativo del sistema operativo
ipcMain.handle('backup:import', async () => {
  if (!mainWindow) return { canceled: true };
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Importar respaldo de configuraciones (.json)',
    properties: ['openFile'],
    filters: [{ name: 'Archivo de Respaldo JSON', extensions: ['json'] }]
  });

  if (canceled || !filePaths || filePaths.length === 0) return { canceled: true };
  const raw = fs.readFileSync(filePaths[0], 'utf-8');
  const parsed = JSON.parse(raw);
  writeDiskData(parsed);
  return { canceled: false, data: parsed, filePath: filePaths[0] };
});

// Exportar Cotización directamente a PDF nativo en Mac / Windows / Linux
ipcMain.handle('quote:export-pdf', async (_event, suggestedJobName) => {
  if (!mainWindow) return { canceled: true };
  const cleanName = (suggestedJobName || 'Cotizacion-3D')
    .replace(/[^a-zA-Z0-9-_áéíóúÁÉÍÓÚñÑ ]/g, '')
    .trim()
    .replace(/\s+/g, '-');

  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Guardar Cotización en PDF',
    defaultPath: `${cleanName || 'Cotizacion-3D'}.pdf`,
    filters: [{ name: 'Documento PDF', extensions: ['pdf'] }]
  });

  if (canceled || !filePath) return { canceled: true };

  const pdfBuffer = await mainWindow.webContents.printToPDF({
    printBackground: true,
    pageSize: 'A4',
    margins: { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 }
  });

  fs.writeFileSync(filePath, pdfBuffer);
  return { canceled: false, filePath };
});

app.whenReady().then(() => {
  setupAppMenu();
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

