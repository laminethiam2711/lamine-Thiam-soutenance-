// Application de bureau GestNotes : ouvre la version de démonstration du site Angular
// (dossier app/, copié depuis frontend/dist/demo/browser) dans sa propre fenêtre.
const { app, BrowserWindow, Menu, protocol, net, shell } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

const DOSSIER = path.join(__dirname, 'app');

// Protocole interne « app:// » : le site est servi comme depuis un vrai serveur
// (modules JavaScript, localStorage), sans dépendre d'Internet.
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

function creerFenetre() {
  const fenetre = new BrowserWindow({
    width: 1366,
    height: 820,
    minWidth: 380,
    minHeight: 600,
    title: 'GestNotes',
    backgroundColor: '#0A1F3D',
    icon: path.join(__dirname, 'build', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  fenetre.loadURL('app://gestnotes/index.html');
  // Les liens externes s'ouvrent dans le navigateur, pas dans l'application
  fenetre.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith('app://')) shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  protocol.handle('app', (requete) => {
    let chemin = decodeURIComponent(new URL(requete.url).pathname);
    if (chemin === '/' || chemin === '') chemin = '/index.html';
    const fichier = path.normalize(path.join(DOSSIER, chemin));
    if (!fichier.startsWith(DOSSIER)) return new Response('Interdit', { status: 403 });
    return net.fetch(pathToFileURL(fichier).toString());
  });
  Menu.setApplicationMenu(null);
  creerFenetre();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) creerFenetre(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
