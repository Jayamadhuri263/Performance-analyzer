const puppeteerAnalyzer = require('./puppeteerAnalyzer');
const { calculatePerformanceScore } = require('../utils/performanceScore');

/**
 * Orchestrates full performance analysis for a given URL.
 * @param {string} url - The URL to analyze
 * @returns {Promise<object>} JSON performance report
 */
async function runAnalysis(url) {
  const analysis = await puppeteerAnalyzer.analyze(url);

  const layoutDurationMs =
    analysis.layoutMetrics?.layoutDuration != null
      ? analysis.layoutMetrics.layoutDuration * 1000
      : 0;

  const { score, grade, warnings } = calculatePerformanceScore({
    loadTime: analysis.loadTime,
    domNodes: analysis.domNodes,
    jsBundleSize: analysis.resourceBreakdown?.js?.size ?? 0,
    imagesSize: analysis.resourceBreakdown?.image?.size ?? 0,
    requestCount: analysis.requests?.totalCount ?? 0,
    layoutDuration: layoutDurationMs,
    jsHeapUsed: analysis.memory?.used ?? 0,
    consoleErrors: analysis.consoleErrors ?? [],
  });

  return {
    url,
    analyzedAt: new Date().toISOString(),
    score,
    grade,
    warnings,
    loadTime: analysis.loadTime,
    domNodes: analysis.domNodes,
    memory: analysis.memory,
    layoutMetrics: analysis.layoutMetrics,
    requests: analysis.requests,
    resourceBreakdown: analysis.resourceBreakdown,
    resourceSummary: analysis.resourceSummary,
    requestTimeline: analysis.requestTimeline,
    jsCoverage: analysis.jsCoverage,
    cssCoverage: analysis.cssCoverage,
    consoleErrors: analysis.consoleErrors,
    consoleWarnings: analysis.consoleWarnings,
    screenshot: analysis.screenshot,
  };
}

module.exports = {
  runAnalysis,
};
