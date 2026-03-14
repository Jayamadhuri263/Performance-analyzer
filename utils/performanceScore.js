const BYTES_PER_MB = 1024 * 1024;
const LOAD_TIME_LIMIT_MS = 3000;
const DOM_NODES_LIMIT = 1500;
const JS_BUNDLE_LIMIT_BYTES = 1 * BYTES_PER_MB;
const IMAGES_LIMIT_BYTES = 2 * BYTES_PER_MB;
const REQUESTS_LIMIT = 100;
const LAYOUT_DURATION_LIMIT_MS = 500;
const JS_HEAP_LIMIT_BYTES = 50 * BYTES_PER_MB;

/**
 * Computes a performance score from analysis metrics.
 * @param {object} metrics - Analysis metrics
 * @param {number|null} [metrics.loadTime] - Page load time in ms
 * @param {number} [metrics.domNodes] - DOM node count
 * @param {number} [metrics.jsBundleSize] - Total JS transfer size in bytes (e.g. resourceBreakdown.js.size)
 * @param {number} [metrics.imagesSize] - Total images transfer size in bytes (e.g. resourceBreakdown.image.size)
 * @param {number} [metrics.requestCount] - Total network request count
 * @param {number|null} [metrics.layoutDuration] - Layout duration in ms
 * @param {number|null} [metrics.jsHeapUsed] - JS heap used in bytes (e.g. memory.used)
 * @param {Array} [metrics.consoleErrors] - Console error messages (length > 0 triggers penalty)
 * @returns {{ score: number, grade: string, warnings: string[] }}
 */
function calculatePerformanceScore(metrics) {
  const warnings = [];
  let penalty = 0;

  const loadTime = metrics.loadTime != null ? metrics.loadTime : 0;
  if (loadTime > LOAD_TIME_LIMIT_MS) {
    penalty += 20;
    warnings.push(`Load time ${loadTime}ms exceeds ${LOAD_TIME_LIMIT_MS}ms`);
  }

  const domNodes = metrics.domNodes != null ? metrics.domNodes : 0;
  if (domNodes > DOM_NODES_LIMIT) {
    penalty += 10;
    warnings.push(`DOM node count ${domNodes} exceeds ${DOM_NODES_LIMIT}`);
  }

  const jsBundleSize = metrics.jsBundleSize != null ? metrics.jsBundleSize : 0;
  if (jsBundleSize > JS_BUNDLE_LIMIT_BYTES) {
    penalty += 15;
    warnings.push(`JS bundle size ${formatBytes(jsBundleSize)} exceeds 1MB`);
  }

  const imagesSize = metrics.imagesSize != null ? metrics.imagesSize : 0;
  if (imagesSize > IMAGES_LIMIT_BYTES) {
    penalty += 10;
    warnings.push(`Images size ${formatBytes(imagesSize)} exceeds 2MB`);
  }

  const requestCount = metrics.requestCount != null ? metrics.requestCount : 0;
  if (requestCount > REQUESTS_LIMIT) {
    penalty += 10;
    warnings.push(`Request count ${requestCount} exceeds ${REQUESTS_LIMIT}`);
  }

  const layoutDuration = metrics.layoutDuration != null ? metrics.layoutDuration : 0;
  if (layoutDuration > LAYOUT_DURATION_LIMIT_MS) {
    penalty += 10;
    warnings.push(`Layout duration ${layoutDuration}ms exceeds ${LAYOUT_DURATION_LIMIT_MS}ms`);
  }

  const jsHeapUsed = metrics.jsHeapUsed != null ? metrics.jsHeapUsed : 0;
  if (jsHeapUsed > JS_HEAP_LIMIT_BYTES) {
    penalty += 10;
    warnings.push(`JS heap used ${formatBytes(jsHeapUsed)} exceeds 50MB`);
  }

  const hasConsoleErrors = Array.isArray(metrics.consoleErrors) && metrics.consoleErrors.length > 0;
  if (hasConsoleErrors) {
    penalty += 5;
    warnings.push(`${metrics.consoleErrors.length} console error(s) detected`);
  }

  const score = Math.max(0, 100 - penalty);
  const grade = getGrade(score);

  return {
    score,
    grade,
    warnings,
  };
}

function getGrade(score) {
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Needs Improvement';
  return 'Poor';
}

function formatBytes(bytes) {
  if (bytes >= BYTES_PER_MB) {
    return `${(bytes / BYTES_PER_MB).toFixed(2)}MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)}KB`;
  }
  return `${bytes}B`;
}

module.exports = {
  calculatePerformanceScore,
  getGrade,
};
