const puppeteer = require('puppeteer-core');

/**
 * Runs a full performance analysis on a URL using Puppeteer.
 * Uses puppeteer-core (no bundled Chromium) so deploys stay small.
 * - When BROWSERLESS_WS_ENDPOINT or BROWSERLESS_TOKEN is set: puppeteer.connect() to Browserless cloud.
 * - Otherwise: puppeteer.launch() with local Chrome (PUPPETEER_EXECUTABLE_PATH or default path).
 */

/** Browserless: full WebSocket URL, or build from token. Set one of these to use Browserless.io (free tier: 6h/month). */
function getBrowserlessWSEndpoint() {
  const endpoint = process.env.BROWSERLESS_WS_ENDPOINT;
  if (endpoint && endpoint.startsWith('wss://')) return endpoint;
  const token = process.env.BROWSERLESS_TOKEN;
  if (token) return `wss://chrome.browserless.io?token=${token}`;
  return null;
}

// Use local Chrome only when not using Browserless. Override with PUPPETEER_EXECUTABLE_PATH if needed.
const CHROME_PATH =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  (process.platform === 'win32' ? 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe' : '/usr/bin/chromium');

/** Network throttling profiles (CDP Network.emulateNetworkConditions). Throughput in bytes/sec. */
const THROTTLING_PROFILES = {
  none: null,
  fast3g: {
    offline: false,
    latency: 562.5,
    downloadThroughput: 1.6 * 1024 * 1024,
    uploadThroughput: 750 * 1024,
  },
  slow3g: {
    offline: false,
    latency: 2000,
    downloadThroughput: 400 * 1024,
    uploadThroughput: 400 * 1024,
  },
  offline: {
    offline: true,
    latency: 0,
    downloadThroughput: 0,
    uploadThroughput: 0,
  },
};

/** Device/viewport presets for mobile viewport analysis. */
const VIEWPORT_PRESETS = {
  desktop: { width: 1280, height: 800, isMobile: false, deviceScaleFactor: 1 },
  'iphone-se': { width: 375, height: 667, isMobile: true, deviceScaleFactor: 2 },
  'iphone-12': { width: 390, height: 844, isMobile: true, deviceScaleFactor: 3 },
  'pixel-5': { width: 393, height: 851, isMobile: true, deviceScaleFactor: 2.75 },
  'galaxy-s20': { width: 360, height: 800, isMobile: true, deviceScaleFactor: 3 },
  ipad: { width: 768, height: 1024, isMobile: true, deviceScaleFactor: 2 },
};

/**
 * @param {string} url - The URL to analyze
 * @param {{ throttling?: keyof typeof THROTTLING_PROFILES }} [options]
 * @returns {Promise<object>} Structured performance report
 */
async function analyze(url, options = {}) {
  const throttlingKey = options.throttling && THROTTLING_PROFILES[options.throttling] !== undefined
    ? options.throttling
    : 'none';
  const throttling = THROTTLING_PROFILES[throttlingKey];
  const viewportPreset = VIEWPORT_PRESETS.desktop;

  const browserlessWSEndpoint = getBrowserlessWSEndpoint();
  const useBrowserless = Boolean(browserlessWSEndpoint);

  const browser = useBrowserless
    ? await puppeteer.connect({
        browserWSEndpoint: browserlessWSEndpoint,
      })
    : await (() => {
        const launchArgs = ['--no-sandbox', '--disable-setuid-sandbox'];
        if (process.env.PUPPETEER_EXECUTABLE_PATH) {
          launchArgs.push('--disable-dev-shm-usage');
        }
        return puppeteer.launch({
          executablePath: CHROME_PATH,
          headless: 'new',
          args: launchArgs,
        });
      })();

  const networkRequestsById = new Map();
  const requestTimeline = [];
  const consoleErrors = [];
  const consoleWarnings = [];

  try {
    const page = await browser.newPage();
    const client = await page.target().createCDPSession();

    await page.setViewport(viewportPreset);

    await client.send('Performance.enable');
    await client.send('Network.enable');

    if (throttling) {
      await client.send('Network.emulateNetworkConditions', throttling);
    }

    client.on('Network.requestWillBeSent', (params) => {
      const { requestId, request, type, timestamp } = params;
      networkRequestsById.set(requestId, {
        url: request.url,
        resourceType: normalizeResourceType(type),
        startTime: timestamp,
        transferSize: null,
        responseTime: null,
      });
    });

    client.on('Network.loadingFinished', (params) => {
      const { requestId, encodedDataLength, timestamp } = params;
      const entry = networkRequestsById.get(requestId);
      if (entry) {
        entry.transferSize = encodedDataLength;
        entry.responseTime = Math.round((timestamp - entry.startTime) * 1000);
        requestTimeline.push({
          url: entry.url,
          resourceType: entry.resourceType,
          transferSize: entry.transferSize,
          responseTime: entry.responseTime,
          startTime: entry.startTime,
        });
      }
    });

    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') consoleErrors.push(text);
      else if (type === 'warning') consoleWarnings.push(text);
    });

    await page.coverage.startJSCoverage();
    await page.coverage.startCSSCoverage();

    await page.goto(url, {
      waitUntil: 'load',
      timeout: 60000,
    });

    const [jsCoverageEntries, cssCoverageEntries] = await Promise.all([
      page.coverage.stopJSCoverage(),
      page.coverage.stopCSSCoverage(),
    ]);

    const jsCoverage = calculateCoverageStats(jsCoverageEntries);
    const cssCoverage = calculateCoverageStats(cssCoverageEntries);

    requestTimeline.sort((a, b) => a.startTime - b.startTime);
    const resourceSummary = buildResourceSummary(requestTimeline);

    const [
      loadTime,
      domNodes,
      memory,
      layoutMetrics,
      screenshot,
      pageTitle,
    ] = await Promise.all([
      getLoadTime(page),
      getDomNodeCount(page),
      getMemoryMetrics(page),
      getLayoutMetrics(client),
      page.screenshot({ fullPage: true, encoding: 'base64' }),
      page.title(),
    ]);

    if (useBrowserless) {
      browser.disconnect();
    } else {
      await browser.close();
    }

    return {
      loadTime,
      domNodes,
      memory,
      layoutMetrics,
      requests: buildRequestMetrics(requestTimeline),
      resourceBreakdown: buildResourceBreakdown(requestTimeline),
      resourceSummary,
      requestTimeline,
      jsCoverage,
      cssCoverage,
      consoleErrors,
      consoleWarnings,
      screenshot,
      pageTitle: pageTitle || '',
    };
  } catch (error) {
    if (useBrowserless) {
      try { browser.disconnect(); } catch (_) { /* ignore */ }
    } else {
      try { await browser.close(); } catch (_) { /* ignore */ }
    }
    throw error;
  }
}

async function getLoadTime(page) {
  return page.evaluate(() => {
    const timing = performance.timing;
    if (timing.loadEventEnd > 0 && timing.navigationStart >= 0) {
      return timing.loadEventEnd - timing.navigationStart;
    }
    return null;
  });
}

async function getDomNodeCount(page) {
  return page.evaluate(() => document.getElementsByTagName('*').length);
}

async function getMemoryMetrics(page) {
  const result = await page.evaluate(() => {
    if (typeof performance !== 'undefined' && performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
      };
    }
    return null;
  });
  return result;
}

async function getLayoutMetrics(client) {
  try {
    const metrics = await client.send('Performance.getMetrics');
    const entries = metrics.metrics || [];

    const getByName = (name) => {
      const entry = entries.find((e) => e.name === name);
      return entry ? entry.value : null;
    };

    return {
      layoutCount: getByName('LayoutCount'),
      layoutDuration: getByName('LayoutDuration'),
      scriptDuration: getByName('ScriptDuration'),
    };
  } catch {
    return {
      layoutCount: null,
      layoutDuration: null,
      scriptDuration: null,
    };
  }
}

function normalizeResourceType(cdpType) {
  const map = {
    Script: 'javascript',
    Stylesheet: 'css',
    Image: 'image',
    Font: 'font',
  };
  return map[cdpType] || 'other';
}

/**
 * Computes total, used, and unused bytes from Puppeteer coverage entries.
 * Each entry has { text, ranges } where ranges are { start, end } for used portions.
 * @param {Array<{ text: string, ranges: Array<{ start: number, end: number }> }>} entries
 * @returns {{ totalBytes: number, usedBytes: number, unusedBytes: number }}
 */
function calculateCoverageStats(entries) {
  let totalBytes = 0;
  let usedBytes = 0;

  for (const entry of entries || []) {
    const textLength = entry.text ? entry.text.length : 0;
    totalBytes += textLength;

    const ranges = entry.ranges || [];
    for (const range of ranges) {
      usedBytes += (range.end || 0) - (range.start || 0);
    }
  }

  return {
    totalBytes,
    usedBytes,
    unusedBytes: Math.max(0, totalBytes - usedBytes),
  };
}

function buildResourceSummary(requestTimeline) {
  const types = ['javascript', 'css', 'image', 'font', 'other'];
  const summary = Object.fromEntries(
    types.map((t) => [t, { count: 0, transferSize: 0 }])
  );

  for (const r of requestTimeline) {
    const type = r.resourceType || 'other';
    if (summary[type]) {
      summary[type].count += 1;
      summary[type].transferSize += r.transferSize != null ? r.transferSize : 0;
    } else {
      summary.other.count += 1;
      summary.other.transferSize += r.transferSize != null ? r.transferSize : 0;
    }
  }

  return summary;
}

function buildRequestMetrics(requestTimeline) {
  const totalCount = requestTimeline.length;
  const byType = {};
  const sizesByType = {};

  for (const r of requestTimeline) {
    const type = r.resourceType || 'other';
    byType[type] = (byType[type] || 0) + 1;
    const size = r.transferSize != null ? r.transferSize : 0;
    sizesByType[type] = (sizesByType[type] || 0) + size;
  }

  return {
    totalCount,
    resourceTypesCount: byType,
    resourceSizes: sizesByType,
  };
}

function buildResourceBreakdown(requestTimeline) {
  const breakdown = {
    js: { count: 0, size: 0 },
    css: { count: 0, size: 0 },
    image: { count: 0, size: 0 },
    font: { count: 0, size: 0 },
    other: { count: 0, size: 0 },
  };

  const typeToKey = {
    javascript: 'js',
    css: 'css',
    image: 'image',
    font: 'font',
  };

  for (const r of requestTimeline) {
    const key = typeToKey[r.resourceType] || 'other';
    breakdown[key].count += 1;
    breakdown[key].size += r.transferSize != null ? r.transferSize : 0;
  }

  return breakdown;
}

module.exports = {
  analyze,
};
