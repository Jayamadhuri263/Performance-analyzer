# Web Performance Analyzer – Backend

## Puppeteer and local Chrome

The app uses **Puppeteer** with your **local Chrome** so npm does not download Chromium.

### Step 1: Skip Chromium download

Before installing (or after removing `node_modules`), set:

**Windows (CMD):**
```bat
set PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
npm install
```

**Windows (PowerShell):**
```powershell
$env:PUPPETEER_SKIP_CHROMIUM_DOWNLOAD="true"; npm install
```

**macOS/Linux:**
```bash
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm install
```

### Step 2: Chrome path

The code is set to use:

`C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`

To use a different Chrome (e.g. 64‑bit or another path), set:

**Windows (CMD):**
```bat
set PUPPETEER_EXECUTABLE_PATH=C:\Path\To\chrome.exe
```

**PowerShell / macOS / Linux:** set `PUPPETEER_EXECUTABLE_PATH` accordingly before starting the server.

Keep Chrome updated to avoid compatibility issues with Puppeteer.
