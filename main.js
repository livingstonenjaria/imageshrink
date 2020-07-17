// * Core nodejs libs
const path = require('path')
const os = require('os')
// * Third party libs
const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron')
const imagemin = require('imagemin')
const imageminMozjpeg = require('imagemin-mozjpeg')
const imageminPngquant = require('imagemin-pngquant')
const slash = require('slash')
const log = require('electron-log')

// * Set Environment
process.env.NODE_ENV = 'production'
// * Check environment
const isDev = process.env.NODE_ENV !== 'production' ? true : false
// * Check platform
const isMac = process.platform === 'darwin' ? true : false

let mainWindow
let aboutWindow
// * Create Main window with custom properties
function createMainWindow() {
  mainWindow = new BrowserWindow({
    title: 'ImageShrink',
    width: 650,
    height: 650,
    icon: `${__dirname}/assets/icons/Icon_256x256.png`,
    resizable: isDev,
    webPreferences: {
      nodeIntegration: true,
    },
  })
  mainWindow.loadFile('./app/index.html')
}
// * Create a custom about window
function createAboutWindow() {
  aboutWindow = new BrowserWindow({
    title: 'About ImageShrink',
    width: 350,
    height: 220,
    icon: `${__dirname}/assets/icons/Icon_256x256.png`,
    resizable: false,
  })
  aboutWindow.loadFile('./app/about.html')
}

// app.on('ready', createMainWindow)
// * Start App
app.whenReady().then(() => {
  createMainWindow()
  // Initialize menu
  const mainMenu = Menu.buildFromTemplate(menu)
  Menu.setApplicationMenu(mainMenu)

  // * Perform garbage collection by initializing main window to null
  mainWindow.on('closed', () => {
    mainWindow = null
  })
})

// * Create Menu
const menu = [
  ...(isMac
    ? [
        {
          label: app.name,
          submenu: [
            {
              label: 'About',
              click: createAboutWindow,
            },
          ],
        },
      ]
    : []),
  {
    role: 'fileMenu',
  },
  ...(!isMac
    ? [
        {
          label: 'Help',
          submenu: [
            {
              label: 'About',
              click: createAboutWindow,
            },
          ],
        },
      ]
    : []),
  ...(isDev
    ? [
        {
          label: 'Developer',
          submenu: [
            { role: 'reload' },
            { role: 'forcereload' },
            { type: 'separator' },
            { role: 'toggledevtools' },
          ],
        },
      ]
    : []),
]

// * Capture data from ui
ipcMain.on('image:minimize', (e, params) => {
  shrinkImage(params)
})

// * Function to minimize image
async function shrinkImage({ imgPath, quality, destination }) {
  try {
    const pngQuality = quality / 100
    const files = await imagemin([slash(imgPath)], {
      destination: destination,
      plugins: [
        imageminMozjpeg({ quality }),
        imageminPngquant({
          quality: [pngQuality, pngQuality],
        }),
      ],
    })
    log.info(files)
    await shell.openPath(destination)
    mainWindow.webContents.send('image:done')
  } catch (error) {
    console.log(error)
    log.error(error)
  }
}

app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow()
  }
})
