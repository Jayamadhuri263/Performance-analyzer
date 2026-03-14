const puppeteerAnalyzer = require('../services/puppeteerAnalyzer');
const { calculatePerformanceScore } = require('../utils/performanceScore');
const reportStore = require('../store/reportStore');
const historyStore = require('../store/historyStore');

/**
 * Analyze workflow:
 * 1. Receive URL (and optional throttling)
 * 2. Call puppeteerAnalyzer
 * 3. Calculate performance score
 * 4. Save report and return response with reportId
 */
async function analyze(req, res) {
  try {
    const { url, throttling } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid url. Expected: { url: string }',
      });
    }

    // 2. Call puppeteerAnalyzer (with optional throttling)
    const analysis = await puppeteerAnalyzer.analyze(url, { throttling });

    // 3. Calculate performance score
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

    // 4. Build response, save for shareable link, return with reportId
    const pageTitle = analysis.pageTitle || '';
    const response = {
      url,
      title: pageTitle,
      score,
      grade,
      metrics: {
        loadTime: analysis.loadTime,
        domNodes: analysis.domNodes,
        memory: analysis.memory,
        layoutMetrics: analysis.layoutMetrics,
        requestCount: analysis.requests?.totalCount ?? 0,
      },
      resourceSummary: analysis.resourceSummary,
      requestTimeline: analysis.requestTimeline,
      coverage: {
        jsCoverage: analysis.jsCoverage,
        cssCoverage: analysis.cssCoverage,
      },
      consoleErrors: analysis.consoleErrors ?? [],
      warnings: warnings ?? [],
      screenshot: analysis.screenshot,
      throttling: throttling || 'none',
    };

    const reportId = reportStore.save(response);
    historyStore.add({
      reportId,
      url: response.url,
      title: response.title,
      createdAt: new Date().toISOString(),
      score: response.score,
      grade: response.grade,
    });
    return res.json({ ...response, reportId });
  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({
      error: 'Analysis failed',
      message: error.message,
    });
  }
}

module.exports = {
  analyze,
};
