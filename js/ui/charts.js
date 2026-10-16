// ═══════════════════════════════════════════════════════════════
// WorkStatus — Charts
// Thin wrappers around Chart.js. Load Chart.js via CDN before this file.
// Usage: chartBar("canvasId", labels, values)
// ═══════════════════════════════════════════════════════════════

const CHART_COLORS = {
  blue:   "#3b82f6",
  green:  "#22c55e",
  yellow: "#eab308",
  red:    "#ef4444",
  purple: "#a855f7",
  orange: "#f97316",
  gray:   "#94a3b8",
};

const CHART_PALETTE = [
  "#3b82f6", "#22c55e", "#eab308", "#ef4444",
  "#a855f7", "#f97316", "#14b8a6", "#ec4899",
];

/**
 * Check that Chart.js is loaded.
 */
function chartsReady() {
  if (typeof Chart === "undefined") {
    console.warn("Chart.js not loaded. Add <script src='https://cdn.jsdelivr.net/npm/chart.js'></script> before charts.js");
    return false;
  }
  return true;
}

/**
 * Wrap a canvas with a fixed-height container so charts render nicely.
 */
function chartWrapper(canvasId, height = "240px") {
  return `<div style="position:relative;height:${height};width:100%"><canvas id="${canvasId}"></canvas></div>`;
}

/**
 * Bar chart.
 * @param {string} canvasId
 * @param {string[]} labels
 * @param {number[]} values
 * @param {Object} [opts]
 */
function chartBar(canvasId, labels, values, opts = {}) {
  if (!chartsReady()) return;
  const el = document.getElementById(canvasId);
  if (!el) return;

  new Chart(el, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: opts.label || "Count",
        data: values,
        backgroundColor: opts.color || CHART_COLORS.blue,
        borderRadius: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 } },
        x: { grid: { display: false } },
      },
    },
  });
}

/**
 * Pie/doughnut chart.
 */
function chartPie(canvasId, labels, values, opts = {}) {
  if (!chartsReady()) return;
  const el = document.getElementById(canvasId);
  if (!el) return;

  new Chart(el, {
    type: opts.doughnut ? "doughnut" : "pie",
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: CHART_PALETTE,
        borderWidth: 2,
        borderColor: "#fff",
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom", labels: { boxWidth: 12 } } },
    },
  });
}

/**
 * Line chart.
 */
function chartLine(canvasId, labels, values, opts = {}) {
  if (!chartsReady()) return;
  const el = document.getElementById(canvasId);
  if (!el) return;

  new Chart(el, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: opts.label || "Count",
        data: values,
        borderColor: opts.color || CHART_COLORS.blue,
        backgroundColor: (opts.color || CHART_COLORS.blue) + "22",
        tension: 0.3,
        fill: true,
        pointRadius: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 } },
        x: { grid: { display: false } },
      },
    },
  });
}