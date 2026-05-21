const STORAGE_KEYS = ['tradingJournalTrades', 'trades'];
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

const monthLabel = document.getElementById('monthLabel');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const calendarGrid = document.getElementById('calendarGrid');
const weeklyGrid = document.getElementById('weeklyGrid');
const statMonthlyPnl = document.getElementById('statMonthlyPnl');
const statWinRate = document.getElementById('statWinRate');
const statWins = document.getElementById('statWins');
const statLosses = document.getElementById('statLosses');
const statTrades = document.getElementById('statTrades');
const statTradingDays = document.getElementById('statTradingDays');
const statRR = document.getElementById('statRR');

function loadAccounts() {
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
    const accounts = loadAccounts();
    return accounts.find((account) => account.id === savedId || account.name === savedName) || (savedName ? saved : null);
  } catch {
    return null;
  }
}

function activeCurrency() {
  return getActiveAccount()?.currency || 'USD';
}

function currencySymbol(currency = activeCurrency()) {
  return currencySymbols[currency] || `${currency} `;
}

function filterByActiveAccount(list) {
  const active = getActiveAccount();
  const activeName = String(active?.name || '').trim().toLowerCase();
  if (!activeName) return list;
  return list.filter((trade) => String(trade.account || '').trim().toLowerCase() === activeName);
}

const demoTrades = [
  { id: 'demo-1', date: '2025-05-01', pair: 'XAU/USD', direction: 'Long', pnl: 1015.5, fee: 0 },
  { id: 'demo-2', date: '2025-05-07', pair: 'AAPL', direction: 'Long', pnl: 834, fee: 0 },
  { id: 'demo-3', date: '2025-05-08', pair: 'USD/JPY', direction: 'Long', pnl: 644.5, fee: 0 },
  { id: 'demo-4', date: '2025-05-09', pair: 'BTC/USDT', direction: 'Long', pnl: 882, fee: 0 },
  { id: 'demo-5', date: '2025-05-10', pair: 'EUR/USD', direction: 'Short', pnl: -209, fee: 0 },
  { id: 'demo-6', date: '2025-05-13', pair: 'MSFT', direction: 'Long', pnl: 851, fee: 0 },
  { id: 'demo-7', date: '2025-05-14', pair: 'NASDAQ', direction: 'Long', pnl: 798, fee: 0 },
  { id: 'demo-8', date: '2025-05-15', pair: 'XAU/USD', direction: 'Short', pnl: -548, fee: 0 },
  { id: 'demo-9', date: '2025-05-16', pair: 'USD/CHF', direction: 'Long', pnl: 1065, fee: 0 },
  { id: 'demo-10', date: '2025-05-17', pair: 'TSLA', direction: 'Long', pnl: 1688, fee: 0 }
];

let visibleDate = getLatestTradeMonth(loadTrades());

function normalizeTrade(trade) {
  const date = trade.date || trade.tradeDate || trade.closeDate || trade.openDate || '';
  const rawPnl = trade.pnl ?? trade.profitLoss ?? trade.profitAndLoss ?? trade.pl ?? trade.pAndL ?? trade.profit ?? 0;
  return {
    ...trade,
    date,
    pnl: Number(rawPnl) || 0,
    fee: Number(trade.fee || trade.commission || 0) || 0,
    count: Number(trade.count || 1) || 1
  };
}

function loadTrades() {
  for (const key of STORAGE_KEYS) {
    const saved = localStorage.getItem(key);
    if (!saved) continue;

    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return filterByActiveAccount(parsed.map(normalizeTrade).filter((trade) => trade.date));
      if (parsed && typeof parsed === 'object') return filterByActiveAccount(objectTradesToArray(parsed).map(normalizeTrade).filter((trade) => trade.date));
    } catch (error) {
      console.warn(`Could not load ${key}`, error);
    }
  }

  localStorage.setItem('tradingJournalTrades', JSON.stringify(demoTrades));
  return filterByActiveAccount(demoTrades.map(normalizeTrade));
}

function objectTradesToArray(data) {
  return Object.entries(data).map(([date, value]) => ({
    id: value.id || date,
    date: value.date || date,
    pnl: Number(value.pnl || value.profitLoss || 0),
    fee: Number(value.fee || 0),
    pair: value.pair || value.asset || '',
    direction: value.direction || '',
    count: Number(value.count || value.trades || 1)
  }));
}

function getLatestTradeMonth(trades) {
  const datedTrades = trades
    .map((trade) => new Date(`${trade.date}T00:00:00`))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b - a);

  const source = datedTrades[0] || new Date();
  return new Date(source.getFullYear(), source.getMonth(), 1);
}

function money(value) {
  const num = Number(value) || 0;
  return `${currencySymbol()} ${Math.abs(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function toneClass(value) {
  const number = Number(value) || 0;
  return number > 0 ? 'positive' : number < 0 ? 'negative' : 'neutral';
}

function toneColor(value) {
  const number = Number(value) || 0;
  if (number > 0) return '#16a34a';
  if (number < 0) return '#dc2626';
  return '#94a3b8';
}

function toneStyle(value) {
  return `style="color: ${toneColor(value)} !important;"`;
}

function setTone(element, value) {
  if (!element) return;
  element.classList.remove('positive', 'negative', 'neutral');
  element.classList.add(toneClass(value));
  element.style.setProperty('color', toneColor(value), 'important');
}

function dateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getMondayFirstMonthCells(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const mondayFirstStart = (first.getDay() + 6) % 7;
  const cells = [];

  const prevLast = new Date(year, month, 0).getDate();
  for (let i = mondayFirstStart - 1; i >= 0; i--) {
    cells.push({ day: prevLast - i, currentMonth: false, date: new Date(year, month - 1, prevLast - i) });
  }

  for (let day = 1; day <= last.getDate(); day++) {
    cells.push({ day, currentMonth: true, date: new Date(year, month, day) });
  }

  let nextDay = 1;
  while (cells.length % 7 !== 0 || cells.length < 35) {
    cells.push({ day: nextDay, currentMonth: false, date: new Date(year, month + 1, nextDay) });
    nextDay++;
  }

  return cells;
}

function groupTradesByDate(trades) {
  return trades.reduce((map, trade) => {
    if (!trade.date) return map;
    if (!map.has(trade.date)) map.set(trade.date, []);
    map.get(trade.date).push(trade);
    return map;
  }, new Map());
}

function tradeNet(trade) {
  return Number(trade.pnl || 0) - Number(trade.fee || 0);
}

function rrForTrade(trade) {
  const entry = Number(trade.entry);
  const stop = Number(trade.stopLoss);
  const target = Number(trade.takeProfit || trade.exit);
  if (!entry || !stop || !target || entry === stop) return null;
  return Math.abs(target - entry) / Math.abs(entry - stop);
}

function updateMonthlyStats(monthTrades, byDate, year, month) {
  const monthlyPnl = monthTrades.reduce((sum, trade) => sum + tradeNet(trade), 0);
  const wins = monthTrades.filter((trade) => tradeNet(trade) > 0).length;
  const losses = monthTrades.filter((trade) => tradeNet(trade) < 0).length;
  const winRate = monthTrades.length ? (wins / monthTrades.length) * 100 : 0;
  const tradingDays = [...byDate.entries()].filter(([key, trades]) => {
    const d = new Date(`${key}T00:00:00`);
    return isSameMonth(d, year, month) && trades.length;
  }).length;
  const rrValues = monthTrades.map(rrForTrade).filter((value) => value !== null && Number.isFinite(value));
  const avgRR = rrValues.length ? rrValues.reduce((sum, value) => sum + value, 0) / rrValues.length : 0;

  statMonthlyPnl.textContent = money(monthlyPnl);
  setTone(statMonthlyPnl, monthlyPnl);
  statWinRate.textContent = `${winRate.toFixed(1)}%`;
  statWins.textContent = wins;
  statLosses.textContent = losses;
  statTrades.textContent = monthTrades.length;
  statTradingDays.textContent = tradingDays;
  statRR.textContent = avgRR.toFixed(2);
}

function isSameMonth(date, year, month) {
  return date.getFullYear() === year && date.getMonth() === month;
}

function renderCalendar() {
  const trades = loadTrades();
  const byDate = groupTradesByDate(trades);
  const year = visibleDate.getFullYear();
  const month = visibleDate.getMonth();
  const cells = getMondayFirstMonthCells(year, month);
  const monthTrades = trades.filter((trade) => {
    const d = new Date(`${trade.date}T00:00:00`);
    return !Number.isNaN(d.getTime()) && isSameMonth(d, year, month);
  });
  const weeks = [];

  monthLabel.textContent = visibleDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  updateMonthlyStats(monthTrades, byDate, year, month);
  calendarGrid.innerHTML = '';
  weeklyGrid.innerHTML = '';

  cells.forEach((cell, index) => {
    if (index % 7 === 0) weeks.push([]);
    weeks[weeks.length - 1].push(cell);

    const key = dateKey(cell.date.getFullYear(), cell.date.getMonth(), cell.date.getDate());
    const dayTrades = cell.currentMonth ? (byDate.get(key) || []) : [];
    const pnl = dayTrades.reduce((sum, trade) => sum + tradeNet(trade), 0);
    const tradeCount = dayTrades.reduce((sum, trade) => sum + Number(trade.count || 1), 0);

    const dayCard = document.createElement('button');
    dayCard.type = 'button';
    dayCard.className = `day-card ${!cell.currentMonth ? 'empty' : ''} ${pnl > 0 ? 'has-profit' : pnl < 0 ? 'has-loss' : ''}`;
    dayCard.innerHTML = `
      <span class="day-trades">${tradeCount ? `${tradeCount} ${tradeCount === 1 ? 'trade' : 'trades'}` : ''}</span>
      <span class="day-number">${cell.day}</span>
      <strong class="day-pnl ${toneClass(pnl)}" ${toneStyle(pnl)}>${tradeCount ? money(pnl) : ''}</strong>
    `;
    calendarGrid.appendChild(dayCard);
  });

  weeks.forEach((week, index) => {
    let weekPnl = 0;
    let weekTrades = 0;

    week.forEach((cell) => {
      if (!cell.currentMonth || !isSameMonth(cell.date, year, month)) return;
      const key = dateKey(cell.date.getFullYear(), cell.date.getMonth(), cell.date.getDate());
      const dayTrades = byDate.get(key) || [];
      const dayPnl = dayTrades.reduce((sum, trade) => sum + tradeNet(trade), 0);
      const dayCount = dayTrades.reduce((sum, trade) => sum + Number(trade.count || 1), 0);
      weekPnl += dayPnl;
      weekTrades += dayCount;
    });

    const weekCard = document.createElement('article');
    weekCard.className = `week-card ${weekPnl > 0 ? 'has-profit' : weekPnl < 0 ? 'has-loss' : ''}`;
    weekCard.innerHTML = `
      <span class="week-count">${weekTrades ? `${weekTrades} ${weekTrades === 1 ? 'trade' : 'trades'}` : ''}</span>
      <span class="week-number">W${index + 1}</span>
      <strong class="week-pnl ${toneClass(weekPnl)}" ${toneStyle(weekPnl)}>${weekTrades ? money(weekPnl) : ''}</strong>
    `;
    weeklyGrid.appendChild(weekCard);
  });

}

function refreshCalendar({ jumpToLatestTradeMonth = false } = {}) {
  const trades = loadTrades();
  if (jumpToLatestTradeMonth && trades.length) {
    visibleDate = getLatestTradeMonth(trades);
  }
  renderCalendar();
}

prevMonthBtn.addEventListener('click', () => {
  visibleDate = new Date(visibleDate.getFullYear(), visibleDate.getMonth() - 1, 1);
  renderCalendar();
});

nextMonthBtn.addEventListener('click', () => {
  visibleDate = new Date(visibleDate.getFullYear(), visibleDate.getMonth() + 1, 1);
  renderCalendar();
});

window.addEventListener('storage', (event) => {
  if ([...STORAGE_KEYS, 'tradingJournalTradesUpdatedAt', ACTIVE_ACCOUNT_KEY, ACCOUNT_STORAGE_KEY].includes(event.key)) {
    refreshCalendar({ jumpToLatestTradeMonth: true });
  }
});

window.addEventListener('focus', () => refreshCalendar());
window.addEventListener('activeAccountChanged', () => refreshCalendar({ jumpToLatestTradeMonth: true }));
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) refreshCalendar();
});

if ('BroadcastChannel' in window) {
  const channel = new BroadcastChannel('trading-journal');
  channel.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'trades-updated') {
      refreshCalendar({ jumpToLatestTradeMonth: true });
    }
  });
}

renderCalendar();
