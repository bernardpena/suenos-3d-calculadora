const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isDesktopApp: true,
  platform: process.platform,
  loadStorage: () => ipcRenderer.invoke('storage:load'),
  saveStorage: (data) => ipcRenderer.invoke('storage:save', data),
  exportBackup: (data) => ipcRenderer.invoke('backup:export', data),
  importBackup: () => ipcRenderer.invoke('backup:import'),
  exportQuotePDF: (jobName) => ipcRenderer.invoke('quote:export-pdf', jobName),
  onTriggerPDF: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('menu:trigger-pdf', listener);
    return () => ipcRenderer.removeListener('menu:trigger-pdf', listener);
  }
});

