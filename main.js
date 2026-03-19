const { app, BrowserWindow, shell, Menu, Tray, ipcMain, dialog, nativeImage } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')
const os = require('os')

// ─────────────────────────────────────────────────────────────────────────────
// 설정
// ─────────────────────────────────────────────────────────────────────────────
const APP_URL = 'https://www.joosan777.com'  // 실제 웹앱 URL
const APP_NAME = '건설 통합결재'
const APP_VERSION = app.getVersion()

let mainWindow = null
let tray = null
let splashWindow = null
let isQuitting = false

// ─────────────────────────────────────────────────────────────────────────────
// 단일 인스턴스 잠금
// ─────────────────────────────────────────────────────────────────────────────
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 스플래시 화면 생성
// ─────────────────────────────────────────────────────────────────────────────
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 480,
    height: 300,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    center: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })
  splashWindow.loadFile('splash.html')
  splashWindow.show()
}

// ─────────────────────────────────────────────────────────────────────────────
// 메인 윈도우 생성
// ─────────────────────────────────────────────────────────────────────────────
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: APP_NAME,
    icon: path.join(__dirname, 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      // 웹 보안 (외부 URL 로드시 필요)
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  })

  // 메뉴 설정
  setupMenu()

  // 앱 URL 로드
  mainWindow.loadURL(APP_URL)

  // 페이지 로드 완료 후 스플래시 닫고 메인 표시
  mainWindow.webContents.on('did-finish-load', () => {
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close()
        splashWindow = null
      }
      mainWindow.show()
      mainWindow.focus()
    }, 500)
  })

  // 로드 실패시
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close()
      splashWindow = null
    }
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(getOfflineHTML())}`)
    mainWindow.show()
  })

  // 외부 링크는 기본 브라우저로 열기
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(APP_URL)) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })

  // 창 닫기 - 트레이로 최소화
  mainWindow.on('close', (event) => {
    if (!isQuitting && tray) {
      event.preventDefault()
      mainWindow.hide()
      if (process.platform === 'win32') {
        tray.displayBalloon({
          iconType: 'info',
          title: APP_NAME,
          content: '앱이 시스템 트레이에서 계속 실행 중입니다.'
        })
      }
    }
  })

  // 내비게이션 보안
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(APP_URL) && !url.startsWith('data:')) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 오프라인 HTML
// ─────────────────────────────────────────────────────────────────────────────
function getOfflineHTML() {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>연결 오류</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
      background: #0f172a; color: #fff;
      display: flex; align-items: center; justify-content: center;
      height: 100vh; text-align: center;
    }
    .container { max-width: 400px; padding: 40px; }
    .icon { font-size: 64px; margin-bottom: 24px; opacity: 0.6; }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 12px; }
    p { color: rgba(255,255,255,0.6); line-height: 1.6; margin-bottom: 28px; }
    button {
      background: #2563eb; color: #fff; border: none;
      padding: 12px 32px; border-radius: 10px; font-size: 16px;
      cursor: pointer; transition: opacity .15s;
    }
    button:hover { opacity: .85; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">📡</div>
    <h1>서버에 연결할 수 없습니다</h1>
    <p>인터넷 연결을 확인하거나 잠시 후 다시 시도해주세요.<br>
    문제가 계속되면 관리자에게 문의하세요.</p>
    <button onclick="window.location.reload()">다시 시도</button>
  </div>
</body>
</html>`
}

// ─────────────────────────────────────────────────────────────────────────────
// 메뉴 설정
// ─────────────────────────────────────────────────────────────────────────────
function setupMenu() {
  const template = [
    {
      label: APP_NAME,
      submenu: [
        { label: '홈으로', click: () => mainWindow.loadURL(APP_URL) },
        { type: 'separator' },
        { label: '새로고침', accelerator: 'CmdOrCtrl+R', click: () => mainWindow.reload() },
        { label: '강제 새로고침', accelerator: 'CmdOrCtrl+Shift+R', click: () => mainWindow.webContents.reloadIgnoringCache() },
        { type: 'separator' },
        { label: `버전: v${APP_VERSION}`, enabled: false },
        { label: '업데이트 확인', click: () => autoUpdater.checkForUpdatesAndNotify() },
        { type: 'separator' },
        { label: '종료', accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4', click: () => { isQuitting = true; app.quit() } }
      ]
    },
    {
      label: '보기',
      submenu: [
        { label: '실제 크기', accelerator: 'CmdOrCtrl+0', click: () => mainWindow.webContents.setZoomLevel(0) },
        { label: '확대', accelerator: 'CmdOrCtrl+Plus', click: () => { const z = mainWindow.webContents.getZoomLevel(); mainWindow.webContents.setZoomLevel(z + 0.5) } },
        { label: '축소', accelerator: 'CmdOrCtrl+-', click: () => { const z = mainWindow.webContents.getZoomLevel(); mainWindow.webContents.setZoomLevel(z - 0.5) } },
        { type: 'separator' },
        { label: '전체화면', accelerator: process.platform === 'darwin' ? 'Ctrl+Cmd+F' : 'F11', click: () => mainWindow.setFullScreen(!mainWindow.isFullScreen()) },
        { type: 'separator' },
        { label: '개발자 도구', accelerator: 'CmdOrCtrl+Shift+I', click: () => mainWindow.webContents.toggleDevTools() }
      ]
    },
    {
      label: '도움말',
      submenu: [
        { label: '웹 브라우저로 열기', click: () => shell.openExternal(APP_URL) },
        { type: 'separator' },
        { label: '앱 정보', click: () => dialog.showMessageBox(mainWindow, {
          type: 'info',
          title: '앱 정보',
          message: APP_NAME,
          detail: `버전: ${APP_VERSION}\n© 2025 Joosan Construction\n\n중소 건설사를 위한 통합 업무 플랫폼`
        }) }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// ─────────────────────────────────────────────────────────────────────────────
// 트레이 설정
// ─────────────────────────────────────────────────────────────────────────────
function setupTray() {
  const iconPath = path.join(__dirname, 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png')
  
  try {
    tray = new Tray(iconPath)
  } catch (e) {
    // 아이콘 없을 시 기본 처리
    const emptyImage = nativeImage.createEmpty()
    tray = new Tray(emptyImage)
  }

  const contextMenu = Menu.buildFromTemplate([
    { label: APP_NAME, enabled: false },
    { label: `v${APP_VERSION}`, enabled: false },
    { type: 'separator' },
    { label: '열기', click: () => { mainWindow.show(); mainWindow.focus() } },
    { label: '새로고침', click: () => { mainWindow.show(); mainWindow.reload() } },
    { type: 'separator' },
    { label: '종료', click: () => { isQuitting = true; app.quit() } }
  ])

  tray.setToolTip(APP_NAME)
  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.focus()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  tray.on('double-click', () => {
    mainWindow.show()
    mainWindow.focus()
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 자동 업데이트
// ─────────────────────────────────────────────────────────────────────────────
function setupAutoUpdater() {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '업데이트 available',
      message: `새 버전(v${info.version})이 있습니다.`,
      detail: '지금 다운로드하시겠습니까?',
      buttons: ['다운로드', '나중에'],
      defaultId: 0
    }).then(result => {
      if (result.response === 0) {
        autoUpdater.downloadUpdate()
      }
    })
  })

  autoUpdater.on('download-progress', (progressInfo) => {
    const percent = Math.round(progressInfo.percent)
    mainWindow.setProgressBar(percent / 100)
    mainWindow.setTitle(`${APP_NAME} - 업데이트 다운로드 중... ${percent}%`)
  })

  autoUpdater.on('update-downloaded', () => {
    mainWindow.setProgressBar(-1)
    mainWindow.setTitle(APP_NAME)
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '업데이트 준비 완료',
      message: '업데이트가 다운로드되었습니다.',
      detail: '앱을 재시작하면 업데이트가 적용됩니다.',
      buttons: ['지금 재시작', '나중에'],
      defaultId: 0
    }).then(result => {
      if (result.response === 0) {
        isQuitting = true
        autoUpdater.quitAndInstall()
      }
    })
  })

  autoUpdater.on('error', (err) => {
    console.error('업데이트 오류:', err)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// IPC 핸들러
// ─────────────────────────────────────────────────────────────────────────────
ipcMain.handle('get-app-version', () => APP_VERSION)
ipcMain.handle('get-platform', () => process.platform)
ipcMain.handle('open-external', (event, url) => shell.openExternal(url))

// ─────────────────────────────────────────────────────────────────────────────
// 앱 이벤트
// ─────────────────────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  // 스플래시 먼저 표시
  createSplashWindow()

  // 메인 윈도우 생성
  setTimeout(() => {
    createMainWindow()
    setupTray()
    setupAutoUpdater()

    // 프로덕션에서만 업데이트 확인
    if (!process.argv.includes('--dev')) {
      setTimeout(() => autoUpdater.checkForUpdatesAndNotify(), 3000)
    }
  }, 800)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (isQuitting) app.quit()
  }
})

app.on('activate', () => {
  if (!mainWindow) {
    createMainWindow()
  } else {
    mainWindow.show()
  }
})

app.on('before-quit', () => {
  isQuitting = true
})
