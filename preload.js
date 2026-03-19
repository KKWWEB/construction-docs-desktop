const { contextBridge, ipcRenderer } = require('electron')

// 안전하게 Electron API를 렌더러에 노출
contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  
  // 앱이 Electron 환경인지 확인용
  isElectron: true,
  appName: '건설 통합결재 Desktop'
})
