// Application de bureau « Bac de français » : la webapp et les livres, utilisables sans internet.
const { app, BrowserWindow, Menu, protocol, session, shell } = require("electron");
const fs = require("fs");
const path = require("path");

// Dossier du site construit par scripts/construire.py (copié dans l'application au moment du paquet)
const SITE = app.isPackaged ? path.join(process.resourcesPath, "site") : path.join(__dirname, "site");

// Le nom de l'application (« Bac de français ») figure dans l'identifiant du navigateur : son « ç »
// fait échouer toutes les requêtes internes. On garde un identifiant en caractères ASCII.
app.userAgentFallback = app.userAgentFallback.replace(/Bac de fran\S*\s*/, "").replace(/[^\x20-\x7E]/g, "");

// Protocole « app:// » déclaré comme sûr : la page peut alors écrire sur la liseuse
// (l'API d'accès aux fichiers n'est disponible que dans un contexte sécurisé).
protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

const TYPES = {
  ".html": "text/html; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".xml": "application/atom+xml; charset=utf-8", ".epub": "application/epub+zip",
  ".zip": "application/zip", ".png": "image/png", ".svg": "image/svg+xml",
  ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
};

function servirSite() {
  protocol.handle("app", async (requete) => {
    const { pathname } = new URL(requete.url);
    let relatif = decodeURIComponent(pathname).replace(/^\/+/, "");
    if (!relatif) relatif = "index.html";
    const chemin = path.normalize(path.join(SITE, relatif));
    if (!chemin.startsWith(SITE + path.sep)) return new Response("Interdit", { status: 403 });
    try {
      const contenu = await fs.promises.readFile(chemin);
      const type = TYPES[path.extname(chemin).toLowerCase()] || "application/octet-stream";
      return new Response(contenu, { status: 200, headers: { "Content-Type": type, "Cache-Control": "no-cache" } });
    } catch {
      return new Response("Introuvable", { status: 404 });
    }
  });
}

function creerFenetre() {
  const fenetre = new BrowserWindow({
    width: 1100,
    height: 860,
    minWidth: 720,
    minHeight: 560,
    title: "Bac de français — Remplir une liseuse",
    backgroundColor: "#f5f0e6",
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true },
  });

  // Liens externes (Wikisource, GitHub…) : ouverts dans le navigateur habituel
  fenetre.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith("app://")) shell.openExternal(url);
    return { action: "deny" };
  });
  fenetre.webContents.on("will-navigate", (evenement, url) => {
    if (!url.startsWith("app://")) { evenement.preventDefault(); shell.openExternal(url); }
  });

  fenetre.loadURL("app://kit/index.html");
}

app.whenReady().then(() => {
  // Autorise la page à lire et écrire dans le dossier de la liseuse choisi par la personne
  session.defaultSession.setPermissionRequestHandler((_wc, permission, rappel) => {
    rappel(["fileSystem", "clipboard-sanitized-write"].includes(permission));
  });
  session.defaultSession.setPermissionCheckHandler((_wc, permission) =>
    ["fileSystem", "clipboard-sanitized-write"].includes(permission));

  if (process.platform === "darwin") {
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { role: "appMenu" }, { role: "editMenu" }, { role: "viewMenu" }, { role: "windowMenu" },
    ]));
  } else {
    Menu.setApplicationMenu(null);
  }

  servirSite();
  creerFenetre();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) creerFenetre(); });
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
