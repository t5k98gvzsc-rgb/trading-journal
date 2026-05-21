const TRADE_STORAGE_KEYS = [
  'tradingJournalTrades',
  'trades',
  'journalTrades',
  'tradeJournalTrades'
];
const ACCOUNT_STORAGE_KEY = 'tradingJournalAccounts';
const ACTIVE_ACCOUNT_KEY = 'tradingJournalActiveAccount';

const currencySymbols = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$'
};

let equityHoverPoints = [];
let lastStats = null;

function readAccounts() {
  try {
    const accounts = JSON.parse(localStorage.getItem(ACCOUNT_STORAGE_KEY));
    return Array.isArray(accounts) ? accounts : [];
  } catch {
    return [];
  }
}

function getActiveAccount() {
  const raw = localStorage.getItem(ACTIVE_ACCOUNT_KEY);
  if (!raw) return null;

  try {
    const saved = JSON.parse(raw);
    const savedName = String(saved?.name || '').trim();
    const savedId = String(saved?.id || '').trim();
    const accounts = readAccounts();
    return accounts.find((account) => account.id === savedId || account.name === savedName) || (savedName ? saved : null);
  } catch {
    return null;
  }
}

function activeCurrency() {
  return getActiveAccount()?.currency || 'USD';
}

function filterByActiveAccount(trades) {
  const active = getActiveAccount();
  const activeName = String(active?.name || '').trim().toLowerCase();
  if (!activeName) return trades;
  return trades.filter((trade) => String(trade.account || '').trim().toLowerCase() === activeName);
}

function currencySymbol(currency = activeCurrency()) {
  return currencySymbols[currency] || `${currency} `;
}

function readTrades() {
  for (const key of TRADE_STORAGE_KEYS) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(normalizeTrade).filter(Boolean);
    } catch (error) {
      console.warn(`Could not read ${key}`, error);
    }
  }
  return [];
}

function normalizeTrade(trade) {
  if (!trade || typeof trade !== 'object') return null;
  const pnl = Number(trade.pnl ?? trade.profitLoss ?? trade.profit ?? trade.pl ?? trade.result ?? 0);
  const date = trade.date || trade.tradeDate || trade.createdAt || '';
  return {
    ...trade,
    id: trade.id || `${date}-${Math.random().toString(16).slice(2)}`,
    date,
    pair: trade.pair || trade.asset || trade.symbol || trade.instrument || 'Unknown',
    direction: trade.direction || trade.side || '',
    account: trade.account || 'Account',
    session: trade.session || trade.marketSession || 'Unspecified',
    pnl: Number.isFinite(pnl) ? pnl : 0
  };
}

function calculateStats(trades) {
  const closed = trades.filter((trade) => trade.date && Number.isFinite(Number(trade.pnl)));
  const wins = closed.filter((trade) => trade.pnl > 0);
  const losses = closed.filter((trade) => trade.pnl < 0);
  const breakeven = closed.filter((trade) => trade.pnl === 0);
  const totalPnl = closed.reduce((sum, trade) => sum + trade.pnl, 0);
  const grossWin = wins.reduce((sum, trade) => sum + trade.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.pnl, 0));
  const expectancy = closed.length ? totalPnl / closed.length : 0;
  const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;
  return { closed, wins, losses, breakeven, totalPnl, grossWin, grossLoss, expectancy, winRate };
}

function money(value, showSign = true, currency = activeCurrency()) {
  const number = Number(value) || 0;
  const symbol = currencySymbol(currency).trim();
  const sign = showSign ? (number > 0 ? '+ ' : number < 0 ? '- ' : '') : '';
  const formatted = Math.abs(number).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${sign}${symbol} ${formatted}`;
}

function compactMoney(value, showSign = true, currency = activeCurrency()) {
  const number = Number(value) || 0;
  const abs = Math.abs(number);
  const symbol = currencySymbol(currency).trim();
  const sign = showSign ? (number > 0 ? '+ ' : number < 0 ? '- ' : '') : '';
  const compact = abs >= 1000000
    ? `${(abs / 1000000).toFixed(abs >= 10000000 ? 0 : 1)}M`
    : abs >= 1000
      ? `${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`
      : abs.toFixed(0);
  return `${sign}${symbol} ${compact}`;
}

function percent(value) {
  return `${(Number(value) || 0).toFixed(1)}%`;
}

function shortDate(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value || '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function setClass(id, className) {
  const element = document.getElementById(id);
  if (element) element.className = className;
}

function toneClass(value) {
  const number = Number(value) || 0;
  return number > 0 ? 'positive' : number < 0 ? 'negative' : 'neutral';
}

function toneColor(value) {
  const number = Number(value) || 0;
  if (number > 0) return '#16a34a';
  if (number < 0) return '#dc2626';
  return '#64748b';
}

function toneStyle(value) {
  return `style="color: ${toneColor(value)} !important;"`;
}

function setTone(id, value) {
  const element = document.getElementById(id);
  if (!element) return;
  element.classList.remove('positive', 'negative', 'neutral');
  element.classList.add(toneClass(value));
  element.style.setProperty('color', toneColor(value), 'important');
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

function renderMetrics(stats) {
  setText('totalPnl', money(stats.totalPnl));
  setTone('totalPnl', stats.totalPnl);
  setText('totalTrades', stats.closed.length);
  setText('winsText', `${stats.wins.length} Wins`);
  setText('lossesText', `${stats.losses.length} Losses`);
  setText('profitFactor', money(stats.expectancy));
  setTone('profitFactor', stats.expectancy);
  setText('winRateValue', percent(stats.winRate));
  setText('legendWins', `${stats.wins.length} Wins`);
  setText('legendLosses', `${stats.losses.length} Losses`);
  setText('legendBE', `${stats.breakeven.length} BE`);
}

function groupDailyPnl(trades) {
  const byDate = new Map();
  trades.forEach((trade) => {
    if (!trade.date) return;
    if (!byDate.has(trade.date)) byDate.set(trade.date, { date: trade.date, daily: 0, trades: [] });
    const day = byDate.get(trade.date);
    day.daily += trade.pnl;
    day.trades.push(trade);
  });
  return [...byDate.values()].sort((a, b) => new Date(`${a.date}T00:00:00`) - new Date(`${b.date}T00:00:00`));
}

function buildEquityPoints(trades) {
  const daily = groupDailyPnl(trades);
  let balance = 0;
  const startDate = daily[0]?.date || new Date().toISOString().slice(0, 10);
  const points = [{ date: startDate, daily: 0, balance: 0, trades: [] }];
  daily.forEach((day) => {
    balance += day.daily;
    points.push({ ...day, balance });
  });
  return points;
}

function setupCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(420, Math.floor(rect.width * dpr));
  canvas.height = Math.max(240, Math.floor(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width: canvas.width / dpr, height: canvas.height / dpr };
}

let equityPinnedPoint = null;
let equityAnimation = null;

function roundedLine(ctx, points, getX, getY) {
  if (!points.length) return;
  ctx.beginPath();
  ctx.moveTo(getX(0), getY(points[0].balance));
  if (points.length === 1) return;
  for (let i = 1; i < points.length - 1; i++) {
    const xc = (getX(i) + getX(i + 1)) / 2;
    const yc = (getY(points[i].balance) + getY(points[i + 1].balance)) / 2;
    ctx.quadraticCurveTo(getX(i), getY(points[i].balance), xc, yc);
  }
  const last = points.length - 1;
  ctx.quadraticCurveTo(getX(last - 1), getY(points[last - 1].balance), getX(last), getY(points[last].balance));
}

function drawEquityCurve(trades, progress = 1) {
  const canvas = document.getElementById('equityChart');
  if (!canvas) return;
  const { ctx, width, height } = setupCanvas(canvas);
  ctx.clearRect(0, 0, width, height);

  const points = buildEquityPoints(trades);
  const values = points.map((point) => point.balance);
  let min = Math.min(...values, 0);
  let max = Math.max(...values, 0);
  if (min === max) { min -= 100; max += 100; }

  const pad = { top: 18, right: 26, bottom: 36, left: 58 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const buffer = Math.max((max - min) * 0.16, 25);
  min -= buffer;
  max += buffer;

  const x = (index) => pad.left + (points.length === 1 ? chartW / 2 : (index / (points.length - 1)) * chartW);
  const y = (value) => pad.top + ((max - value) / (max - min)) * chartH;

  // soft grid + compact labels
  ctx.strokeStyle = '#eef2f7';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px Arial';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  for (let i = 0; i <= 4; i++) {
    const value = min + ((max - min) / 4) * i;
    const yy = y(value);
    ctx.beginPath();
    ctx.moveTo(pad.left, yy);
    ctx.lineTo(width - pad.right, yy);
    ctx.stroke();
    ctx.fillText(compactMoney(value), pad.left - 10, yy);
  }

  // date labels, only useful spacing
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const labelStep = Math.max(1, Math.ceil(points.length / 5));
  points.forEach((point, index) => {
    if (index % labelStep !== 0 && index !== points.length - 1) return;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(shortDate(point.date), x(index), height - 24);
  });

  const zeroY = y(0);
  ctx.strokeStyle = '#dbe3ef';
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(pad.left, zeroY);
  ctx.lineTo(width - pad.right, zeroY);
  ctx.stroke();
  ctx.setLineDash([]);

  const animatedLength = Math.max(1, Math.floor((points.length - 1) * progress) + 1);
  const visible = points.slice(0, animatedLength);
  if (progress < 1 && animatedLength < points.length) {
    const next = points[animatedLength];
    const prev = points[animatedLength - 1];
    const local = ((points.length - 1) * progress) % 1;
    visible.push({
      ...next,
      balance: prev.balance + (next.balance - prev.balance) * local,
      daily: next.daily,
      date: next.date,
      trades: next.trades
    });
  }

  // gradient fill
  const gradient = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
  gradient.addColorStop(0, 'rgba(109, 74, 255, 0.24)');
  gradient.addColorStop(1, 'rgba(109, 74, 255, 0.015)');

  roundedLine(ctx, visible, (i) => x(i), (v) => y(v));
  ctx.lineTo(x(visible.length - 1), pad.top + chartH);
  ctx.lineTo(x(0), pad.top + chartH);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // main line
  roundedLine(ctx, visible, (i) => x(i), (v) => y(v));
  ctx.strokeStyle = '#6d4aff';
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();

  // subtle glow
  roundedLine(ctx, visible, (i) => x(i), (v) => y(v));
  ctx.strokeStyle = 'rgba(109, 74, 255, 0.16)';
  ctx.lineWidth = 10;
  ctx.stroke();

  // invisible hover/click points for each trading date
  equityHoverPoints = points.map((point, index) => ({ ...point, x: x(index), y: y(point.balance) }));
}

function showEquityTooltip(point) {
  const canvas = document.getElementById('equityChart');
  const tooltip = document.getElementById('equityTooltip');
  if (!canvas || !tooltip || !point) return;
  const rect = canvas.getBoundingClientRect();
  tooltip.style.display = 'block';
  tooltip.style.left = `${Math.min(rect.width - 185, Math.max(10, point.x + 14))}px`;
  tooltip.style.top = `${Math.max(10, point.y - 62)}px`;
  tooltip.innerHTML = `
    <strong>${shortDate(point.date)}</strong>
    <div class="tooltip-row"><span class="tooltip-label">Daily P&L</span><span>${compactMoney(point.daily)}</span></div>
    <div class="tooltip-row"><span class="tooltip-label">Total</span><span>${compactMoney(point.balance)}</span></div>
    <div class="tooltip-row"><span class="tooltip-label">Trades</span><span>${point.trades?.length || 0}</span></div>
  `;
}

function attachEquityTooltip() {
  const canvas = document.getElementById('equityChart');
  const tooltip = document.getElementById('equityTooltip');
  if (!canvas || !tooltip) return;

  const nearestPoint = (event) => {
    if (!equityHoverPoints.length) return null;
    const rect = canvas.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    return equityHoverPoints.reduce((best, point) => Math.abs(point.x - mx) < Math.abs(best.x - mx) ? point : best, equityHoverPoints[0]);
  };

  canvas.addEventListener('mousemove', (event) => {
    const nearest = nearestPoint(event);
    if (!nearest) return;
    showEquityTooltip(nearest);
  });

  canvas.addEventListener('click', (event) => {
    equityPinnedPoint = nearestPoint(event);
    showEquityTooltip(equityPinnedPoint);
  });

  canvas.addEventListener('mouseleave', () => {
    if (!equityPinnedPoint) tooltip.style.display = 'none';
  });

  document.addEventListener('click', (event) => {
    if (event.target === canvas) return;
    equityPinnedPoint = null;
  });
}

function animateEquityCurve(trades) {
  if (equityAnimation) cancelAnimationFrame(equityAnimation);
  const start = performance.now();
  const duration = 650;
  const tick = (now) => {
    const raw = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - raw, 3);
    drawEquityCurve(trades, eased);
    if (raw < 1) equityAnimation = requestAnimationFrame(tick);
  };
  equityAnimation = requestAnimationFrame(tick);
}

function drawWinRateGauge(stats) {
  const canvas = document.getElementById('winRateChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(260, Math.floor(rect.width * dpr));
  canvas.height = Math.max(150, Math.floor(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const width = canvas.width / dpr;
  const height = canvas.height / dpr;
  ctx.clearRect(0, 0, width, height);

  const centerX = width / 2;
  const centerY = height - 14;
  const radius = Math.min(width * 0.38, height * 0.78);
  const start = Math.PI;
  const end = Math.PI * 2;
  const total = Math.max(1, stats.closed.length);
  const segments = [
    { count: stats.wins.length, color: '#16a34a' },
    { count: stats.losses.length, color: '#dc2626' },
    { count: stats.breakeven.length, color: '#94a3b8' }
  ];

  ctx.lineWidth = 18;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#eef2f7';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, start, end);
  ctx.stroke();

  let current = start;
  segments.forEach((segment) => {
    if (!segment.count) return;
    const segmentEnd = current + (end - start) * (segment.count / total);
    ctx.strokeStyle = segment.color;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, current, segmentEnd);
    ctx.stroke();
    current = segmentEnd;
  });
}
function summarizeByField(trades, field) {
  const map = new Map();
  trades.forEach((trade) => {
    const key = trade[field] || 'Unspecified';
    if (!map.has(key)) map.set(key, { name: key, pnl: 0, trades: 0 });
    const item = map.get(key);
    item.pnl += trade.pnl;
    item.trades += 1;
  });
  return [...map.values()].sort((a, b) => b.pnl - a.pnl);
}

function renderBestAssets(trades) {
  const assets = summarizeByField(trades, 'pair');
  const best = assets[0];
  const worst = assets.length ? [...assets].sort((a, b) => a.pnl - b.pnl)[0] : null;

  setText('bestAsset', best?.name || '—');
  setText('bestAssetPnl', best ? money(best.pnl) : money(0));
  setTone('bestAssetPnl', best?.pnl || 0);

  setText('worstAsset', worst?.name || '—');
  setText('worstAssetPnl', worst ? money(worst.pnl) : money(0));
  setTone('worstAssetPnl', worst?.pnl || 0);
}

function renderSessionPerformance(trades) {
  const container = document.getElementById('sessionList');
  if (!container) return;
  const sessions = summarizeByField(trades, 'session');
  const preferred = ['London', 'New York', 'Asia', 'Unspecified'];
  const ordered = [
    ...preferred.map((name) => sessions.find((item) => item.name.toLowerCase() === name.toLowerCase())).filter(Boolean),
    ...sessions.filter((item) => !preferred.some((name) => name.toLowerCase() === item.name.toLowerCase()))
  ].slice(0, 4);

  if (!ordered.length) {
    container.innerHTML = '<div class="empty-dashboard">No session data yet.</div>';
    return;
  }

  container.innerHTML = ordered.map((session) => `
    <div class="session-card">
      <span>${escapeHTML(session.name)}</span>
      <strong class="${toneClass(session.pnl)}" ${toneStyle(session.pnl)}>${money(session.pnl)}</strong>
      <small>${session.trades} trades</small>
    </div>
  `).join('');
}

function renderRecentTrades(trades) {
  const list = document.getElementById('recentTrades');
  if (!list) return;
  const recent = [...trades]
    .sort((a, b) => new Date(`${b.date}T00:00:00`) - new Date(`${a.date}T00:00:00`))
    .slice(0, 3);

  setText('recentCount', `${recent.length} latest`);

  if (!recent.length) {
    list.innerHTML = '<div class="empty-dashboard">No trades yet. Add trades from the Trades page.</div>';
    return;
  }

  list.innerHTML = recent.map((trade) => {
    const result = trade.pnl > 0 ? 'Win' : trade.pnl < 0 ? 'Loss' : 'BE';
    const resultClass = toneClass(trade.pnl);
    const rowClass = trade.pnl > 0 ? 'is-win' : trade.pnl < 0 ? 'is-loss' : '';
    return `
      <div class="recent-trade ${rowClass}">
        <div class="recent-main">
          <strong>${escapeHTML(trade.pair)}</strong>
          <span>${shortDate(trade.date)}${trade.direction ? ` • ${escapeHTML(trade.direction)}` : ''}</span>
        </div>
        <div class="recent-pnl ${resultClass}" ${toneStyle(trade.pnl)}>${money(trade.pnl)}</div>
        <div class="recent-result">${result}</div>
      </div>
    `;
  }).join('');
}

function renderDashboard() {
  const trades = filterByActiveAccount(readTrades());
  const stats = calculateStats(trades);
  lastStats = stats;
  renderMetrics(stats);
  animateEquityCurve(stats.closed);
  drawWinRateGauge(stats);
  renderBestAssets(stats.closed);
  renderSessionPerformance(stats.closed);
  renderRecentTrades(stats.closed);
}

window.addEventListener('DOMContentLoaded', () => {
  renderDashboard();
  attachEquityTooltip();
});
window.addEventListener('resize', renderDashboard);
window.addEventListener('storage', renderDashboard);
window.addEventListener('trades-updated', renderDashboard);
window.addEventListener('activeAccountChanged', renderDashboard);
