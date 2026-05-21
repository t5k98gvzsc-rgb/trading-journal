const STORAGE_KEY = 'tradingJournalTrades';
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

const demoTrades = [
  { id: crypto.randomUUID(), date: '2025-04-04', pair: 'USD/CHF', direction: 'Short', account: 'FTMO', confirmation: 'CHOCH, Liquidity Sweep', entry: 0.915, exit: 0.9085, stopLoss: 0.92, takeProfit: 0.907, lotSize: 1, fees: 2, pnl: 120, resultPercent: 2.4, riskPercent: 1, session: 'London', emotionTag: 'Disciplined', tradeNote: 'Waited for confirmation and executed cleanly.' },
  { id: crypto.randomUUID(), date: '2025-04-11', pair: 'MSFT', direction: 'Long', account: 'Personal', confirmation: 'Trendline, Fibonacci', entry: 310.5, exit: 321.9, stopLoss: 305, takeProfit: 322, lotSize: 0.5, fees: 1, pnl: 540, resultPercent: 4.1, riskPercent: 1.5, session: 'New York', emotionTag: 'Calm', tradeNote: 'Good continuation entry.' },
  { id: crypto.randomUUID(), date: '2025-04-18', pair: 'AUD/USD', direction: 'Short', account: 'ByBit', confirmation: 'FVG, AMD', entry: 1.5, exit: 1.58, stopLoss: 1.53, takeProfit: 1.44, lotSize: 2, fees: 3, pnl: -90, resultPercent: -1.2, riskPercent: 1, session: 'Asia', emotionTag: 'FOMO', tradeNote: 'Entered too early before confirmation.' }
];

let trades = normalizeTrades(loadTrades());
let selectedConfluences = [];

const elements = {
  tableBody: document.getElementById('tradesTableBody'),
  emptyState: document.getElementById('emptyState'),
  galleryView: document.getElementById('galleryView'),
  monthlyView: document.getElementById('monthlyView'),
  modal: document.getElementById('tradeModal'),
  modalTitle: document.getElementById('modalTitle'),
  form: document.getElementById('tradeForm'),
  tradeId: document.getElementById('tradeId'),
  tradeDate: document.getElementById('tradeDate'),
  pair: document.getElementById('pair'),
  direction: document.getElementById('direction'),
  account: document.getElementById('account'),
  confirmation: document.getElementById('confirmation'),
  entry: document.getElementById('entry'),
  exit: document.getElementById('exit'),
  stopLoss: document.getElementById('stopLoss'),
  takeProfit: document.getElementById('takeProfit'),
  lotSize: document.getElementById('lotSize'),
  fees: document.getElementById('fees'),
  pnl: document.getElementById('pnl'),
  resultPercent: document.getElementById('resultPercent'),
  riskPercent: document.getElementById('riskPercent'),
  session: document.getElementById('session'),
  emotionTag: document.getElementById('emotionTag'),
  tradeNote: document.getElementById('tradeNote'),
  screenshotUpload: document.getElementById('screenshotUpload'),
  screenshotData: document.getElementById('screenshotData'),
  screenshotPreview: document.getElementById('screenshotPreview'),
  uploadText: document.getElementById('uploadText'),
  rrPreview: document.getElementById('rrPreview'),
  resultPreview: document.getElementById('resultPreview'),
  confluenceSelector: document.getElementById('confluenceSelector'),
  accountSuggestions: document.getElementById('accountSuggestions')
};


function loadAccounts() {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNT_STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function getActiveAccount() {
  const accounts = loadAccounts();
  const raw = localStorage.getItem(ACTIVE_ACCOUNT_KEY);

  if (raw) {
    try {
      const saved = JSON.parse(raw);
      const savedName = String(saved?.name || '').trim();
      const savedId = String(saved?.id || '').trim();
      const matchedAccount = accounts.find((account) => account.id === savedId || account.name === savedName);

      if (matchedAccount) return matchedAccount;
    } catch {}
  }

  return accounts[0] || null;
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
  if (!activeName) return [];
  return list.filter((trade) => String(trade.account || '').trim().toLowerCase() === activeName);
}

function getSavedAccountNames() {
  return loadAccounts()
    .map((account) => String(account.name || '').trim())
    .filter(Boolean)
    .filter((name, index, list) => list.findIndex((item) => item.toLowerCase() === name.toLowerCase()) === index)
    .sort((a, b) => a.localeCompare(b));
}

function renderAccountSuggestions() {
  const savedAccounts = getSavedAccountNames();

  if (!elements.accountSuggestions) return;

  elements.accountSuggestions.innerHTML = savedAccounts
    .map((name) => `<option value="${escapeHtml(name)}"></option>`)
    .join('');

  elements.account.placeholder = savedAccounts.length
    ? 'Choose one of your saved accounts'
    : 'Create an account first in Accounts';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function loadTrades() {
  const savedTrades = localStorage.getItem(STORAGE_KEY);
  if (!savedTrades) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(demoTrades));
    return demoTrades;
  }

  try {
    return JSON.parse(savedTrades);
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(demoTrades));
    return demoTrades;
  }
}

function normalizeTrades(list) {
  return (Array.isArray(list) ? list : []).map((trade) => ({
    id: trade.id || crypto.randomUUID(),
    date: trade.date || new Date().toISOString().slice(0, 10),
    pair: trade.pair || '',
    direction: trade.direction || 'Long',
    account: trade.account || '',
    confirmation: trade.confirmation || trade.confluences || '',
    entry: Number(trade.entry || 0),
    exit: Number(trade.exit || 0),
    stopLoss: Number(trade.stopLoss || trade.sl || 0),
    takeProfit: Number(trade.takeProfit || trade.tp || 0),
    lotSize: Number(trade.lotSize || 0),
    fees: Number(trade.fees || trade.fee || 0),
    pnl: Number(trade.pnl || 0),
    resultPercent: trade.resultPercent ?? trade.result ?? '',
    riskPercent: trade.riskPercent ?? trade.risk ?? '',
    session: trade.session === 'London/New York' ? 'London + New York' : (trade.session || ''),
    emotionTag: trade.emotionTag || trade.emotion || '',
    tradeNote: trade.tradeNote || trade.note || '',
    screenshot: trade.screenshot || trade.screenshotData || ''
  }));
}


function recalculateAccountBalances() {
  const accounts = loadAccounts();
  if (!accounts.length) return;

  const updatedAccounts = accounts.map((account) => {
    const accountName = String(account.name || '').trim().toLowerCase();
    const accountPnl = trades
      .filter((trade) => String(trade.account || '').trim().toLowerCase() === accountName)
      .reduce((sum, trade) => sum + (Number(trade.pnl) || 0), 0);

    return {
      ...account,
      totalPnl: accountPnl,
      currentBalance: (Number(account.startingBalance) || 0) + accountPnl
    };
  });

  localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(updatedAccounts));
  window.dispatchEvent(new Event('accountsUpdated'));
  window.dispatchEvent(new StorageEvent('storage', { key: ACCOUNT_STORAGE_KEY }));
}

function saveTrades() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
  recalculateAccountBalances();
  window.dispatchEvent(new Event('tradesUpdated'));
  try {
    new BroadcastChannel('tradingJournal').postMessage({ type: 'tradesUpdated' });
    new BroadcastChannel('trading-journal').postMessage({ type: 'trades-updated' });
  } catch {}
  localStorage.setItem('tradingJournalTradesUpdatedAt', Date.now().toString());
}

function formatMoney(value) {
  const number = Number(value) || 0;
  const sign = number > 0 ? '+' : number < 0 ? '-' : '';
  return `${sign}${currencySymbol()}${Math.abs(number).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

function getResultClass(pnl) {
  if (Number(pnl) > 0) return 'win';
  if (Number(pnl) < 0) return 'loss';
  return 'be';
}

function getMoneyClass(pnl) {
  if (Number(pnl) > 0) return 'green';
  if (Number(pnl) < 0) return 'red';
  return 'neutral';
}

function splitConfluences(value) {
  if (Array.isArray(value)) return value;
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function renderTrades() {
  const sortedTrades = filterByActiveAccount(trades).sort((a, b) => new Date(b.date) - new Date(a.date));
  elements.tableBody.innerHTML = '';

  sortedTrades.forEach((trade) => {
    const row = document.createElement('tr');
    row.className = getResultClass(trade.pnl);
    const confluences = splitConfluences(trade.confirmation);

    row.innerHTML = `
      <td>${trade.pair}</td>
      <td>${formatDate(trade.date)}</td>
      <td><span class="tag ${String(trade.direction || '').toLowerCase().replace(/\s+/g, '-')}">${trade.direction || '—'}</span></td>
      <td>${trade.account || '—'}</td>
      <td>${confluences.length ? confluences.slice(0, 3).map((item) => `<span class="small-pill">${item}</span>`).join('') : '—'}</td>
      <td>${trade.entry || '—'}</td>
      <td>${trade.stopLoss || '—'}</td>
      <td>${trade.takeProfit || '—'}</td>
      <td>${trade.lotSize || '—'}</td>
      <td>${trade.fees ? formatMoney(-Math.abs(trade.fees)) : `${currencySymbol()}0`}</td>
      <td class="${getMoneyClass(trade.pnl)}">${formatMoney(trade.pnl)}</td>
      <td>${trade.resultPercent !== '' ? `${trade.resultPercent}%` : '—'}</td>
      <td>${trade.riskPercent !== '' ? `${trade.riskPercent}%` : '—'}</td>
      <td>${trade.session || '—'}</td>
      <td>${trade.emotionTag || '—'}</td>
      <td>${trade.screenshot ? 'Attached' : '—'}</td>
      <td>${trade.tradeNote ? trade.tradeNote.slice(0, 42) + (trade.tradeNote.length > 42 ? '…' : '') : '—'}</td>
      <td>
        <div class="actions">
          <button class="action-btn edit-btn" data-action="edit" data-id="${trade.id}">Edit</button>
          <button class="action-btn delete-btn" data-action="delete" data-id="${trade.id}">Delete</button>
        </div>
      </td>
    `;

    elements.tableBody.appendChild(row);
  });

  elements.emptyState.style.display = sortedTrades.length ? 'none' : 'block';
  renderGallery(sortedTrades);
  renderMonthly(sortedTrades);
}

function renderGallery(list) {
  elements.galleryView.innerHTML = list.map((trade) => `
    <article class="gallery-card ${getResultClass(trade.pnl)}">
      <strong>${trade.pair}</strong>
      <p>${formatDate(trade.date)} · ${trade.direction} · ${trade.session || 'No session'}</p>
      <div class="gallery-shot">${trade.screenshot ? `<img src="${trade.screenshot}" alt="${trade.pair} screenshot">` : 'No Screenshot'}</div>
      <p class="${getMoneyClass(trade.pnl)}"><strong>${formatMoney(trade.pnl)}</strong></p>
      <small>${trade.confirmation || 'No confluences added'}</small>
    </article>
  `).join('') || '<p class="empty-state" style="display:block;">No trades found.</p>';
}

function renderMonthly(list) {
  const monthly = list.reduce((acc, trade) => {
    const key = trade.date.slice(0, 7);
    if (!acc[key]) acc[key] = { pnl: 0, trades: 0, wins: 0, losses: 0 };
    acc[key].pnl += Number(trade.pnl) || 0;
    acc[key].trades += 1;
    if (Number(trade.pnl) > 0) acc[key].wins += 1;
    if (Number(trade.pnl) < 0) acc[key].losses += 1;
    return acc;
  }, {});

  elements.monthlyView.innerHTML = Object.entries(monthly).sort(([a], [b]) => b.localeCompare(a)).map(([month, data]) => {
    const label = new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    return `
      <article class="month-card">
        <h3>${label}</h3>
        <strong class="${getMoneyClass(data.pnl)}">${formatMoney(data.pnl)}</strong>
        <p>${data.trades} trades · ${data.wins} wins · ${data.losses} losses</p>
      </article>
    `;
  }).join('') || '<p class="empty-state" style="display:block;">No monthly data found.</p>';
}

function updateConfluenceInput() {
  elements.confirmation.value = selectedConfluences.join(', ');
  elements.confluenceSelector.querySelectorAll('button').forEach((button) => {
    button.classList.toggle('selected', selectedConfluences.includes(button.dataset.value));
  });
}

function setConfluences(value) {
  selectedConfluences = splitConfluences(value);
  updateConfluenceInput();
}

function clearScreenshot() {
  elements.screenshotData.value = '';
  elements.screenshotPreview.removeAttribute('src');
  elements.screenshotPreview.closest('.upload-box').classList.remove('has-image');
  elements.uploadText.textContent = 'Click to upload a chart screenshot';
  elements.screenshotUpload.value = '';
}

function setScreenshot(dataUrl) {
  elements.screenshotData.value = dataUrl || '';
  if (dataUrl) {
    elements.screenshotPreview.src = dataUrl;
    elements.screenshotPreview.closest('.upload-box').classList.add('has-image');
    elements.uploadText.textContent = 'Screenshot attached';
  } else {
    clearScreenshot();
  }
}

function calculateRR() {
  const entry = Number(elements.entry.value);
  const stop = Number(elements.stopLoss.value);
  const target = Number(elements.takeProfit.value);
  const direction = elements.direction.value.trim();

  if (!entry || !stop || !target || entry === stop) {
    elements.rrPreview.textContent = '—';
    elements.resultPreview.textContent = 'Complete entry, SL and TP to estimate R:R.';
    return;
  }

  if (!['Long', 'Short'].includes(direction)) {
    elements.rrPreview.textContent = '—';
    elements.resultPreview.textContent = 'R:R is calculated only for Long or Short trades.';
    return;
  }

  const risk = direction === 'Long' ? entry - stop : stop - entry;
  const reward = direction === 'Long' ? target - entry : entry - target;

  if (risk <= 0 || reward <= 0) {
    elements.rrPreview.textContent = 'Invalid';
    elements.resultPreview.textContent = 'Check that stop loss and take profit match the trade direction.';
    return;
  }

  const rr = reward / risk;
  elements.rrPreview.textContent = `${rr.toFixed(2)}R`;
  elements.resultPreview.textContent = `Potential reward is ${rr.toFixed(2)}x the defined risk.`;
}

function openModal(trade = null) {
  renderAccountSuggestions();
  elements.form.reset();
  clearScreenshot();
  setConfluences('');
  elements.modal.classList.add('open');
  elements.modal.setAttribute('aria-hidden', 'false');

  if (trade) {
    elements.modalTitle.textContent = 'Edit Trade';
    elements.tradeId.value = trade.id;
    elements.tradeDate.value = trade.date;
    elements.pair.value = trade.pair;
    elements.direction.value = trade.direction;
    elements.account.value = trade.account;
    setConfluences(trade.confirmation);
    elements.entry.value = trade.entry || '';
    elements.exit.value = trade.exit || '';
    elements.stopLoss.value = trade.stopLoss || '';
    elements.takeProfit.value = trade.takeProfit || '';
    elements.lotSize.value = trade.lotSize || '';
    elements.fees.value = trade.fees || '';
    elements.pnl.value = trade.pnl || '';
    elements.resultPercent.value = trade.resultPercent ?? '';
    elements.riskPercent.value = trade.riskPercent ?? '';
    elements.session.value = trade.session || '';
    elements.emotionTag.value = trade.emotionTag || '';
    elements.tradeNote.value = trade.tradeNote || '';
    setScreenshot(trade.screenshot || '');
  } else {
    elements.modalTitle.textContent = 'Add New Trade';
    elements.tradeId.value = '';
    elements.tradeDate.value = new Date().toISOString().slice(0, 10);
    const active = getActiveAccount();
    if (active?.name) elements.account.value = active.name;
  }

  calculateRR();
  setTimeout(() => elements.pair.focus(), 50);
}

function closeModal() {
  elements.modal.classList.remove('open');
  elements.modal.setAttribute('aria-hidden', 'true');
}

function validateTrade(trade) {
  if (!trade.date || !trade.pair || !trade.account) return 'Please fill in date, pair and account.';
  if (!Number.isFinite(trade.entry) || !Number.isFinite(trade.exit) || !Number.isFinite(trade.lotSize) || !Number.isFinite(trade.pnl)) {
    return 'Entry, exit, lot size and P&L must be valid numbers.';
  }
  return '';
}

function handleSubmit(event) {
  event.preventDefault();

  const trade = {
    id: elements.tradeId.value || crypto.randomUUID(),
    date: elements.tradeDate.value,
    pair: elements.pair.value.trim().toUpperCase(),
    direction: elements.direction.value,
    account: elements.account.value.trim(),
    confirmation: elements.confirmation.value.trim(),
    entry: Number(elements.entry.value),
    exit: Number(elements.exit.value),
    stopLoss: Number(elements.stopLoss.value || 0),
    takeProfit: Number(elements.takeProfit.value || 0),
    lotSize: Number(elements.lotSize.value),
    fees: Number(elements.fees.value || 0),
    pnl: Number(elements.pnl.value),
    resultPercent: elements.resultPercent.value === '' ? '' : Number(elements.resultPercent.value),
    riskPercent: elements.riskPercent.value === '' ? '' : Number(elements.riskPercent.value),
    session: elements.session.value,
    emotionTag: elements.emotionTag.value,
    tradeNote: elements.tradeNote.value.trim(),
    screenshot: elements.screenshotData.value
  };

  const error = validateTrade(trade);
  if (error) {
    alert(error);
    return;
  }

  const existingIndex = trades.findIndex((item) => item.id === trade.id);
  if (existingIndex >= 0) trades[existingIndex] = trade;
  else trades.push(trade);

  saveTrades();
  renderTrades();
  closeModal();
}

function handleTableClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const trade = trades.find((item) => item.id === button.dataset.id);
  if (!trade) return;

  if (button.dataset.action === 'edit') openModal(trade);

  if (button.dataset.action === 'delete') {
    const confirmed = confirm(`Delete ${trade.pair} trade?`);
    if (!confirmed) return;
    trades = trades.filter((item) => item.id !== trade.id);
    saveTrades();
    renderTrades();
  }
}

function handleScreenshotUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    alert('Please upload an image file.');
    return;
  }

  const reader = new FileReader();
  reader.onload = () => setScreenshot(reader.result);
  reader.readAsDataURL(file);
}

function switchView(event) {
  const button = event.target.closest('.view-tab');
  if (!button) return;

  document.querySelectorAll('.view-tab').forEach((tab) => tab.classList.remove('active'));
  document.querySelectorAll('.view-panel').forEach((panel) => panel.classList.remove('active'));
  button.classList.add('active');
  document.getElementById(`${button.dataset.view}View`).classList.add('active');
}

document.getElementById('openTradeForm').addEventListener('click', () => openModal());
document.getElementById('closeTradeForm').addEventListener('click', closeModal);
document.getElementById('cancelForm').addEventListener('click', closeModal);
elements.form.addEventListener('submit', handleSubmit);
elements.tableBody.addEventListener('click', handleTableClick);
elements.screenshotUpload.addEventListener('change', handleScreenshotUpload);
document.querySelector('.view-tabs').addEventListener('click', switchView);

elements.confluenceSelector.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-value]');
  if (!button) return;
  const value = button.dataset.value;
  selectedConfluences = selectedConfluences.includes(value)
    ? selectedConfluences.filter((item) => item !== value)
    : [...selectedConfluences, value];
  updateConfluenceInput();
});

['entry', 'stopLoss', 'takeProfit', 'direction'].forEach((key) => {
  elements[key].addEventListener('input', calculateRR);
  elements[key].addEventListener('change', calculateRR);
});

elements.modal.addEventListener('click', (event) => {
  if (event.target === elements.modal) closeModal();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeModal();
});

window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY) {
    trades = normalizeTrades(loadTrades());
    renderTrades();
  }

  if (event.key === ACCOUNT_STORAGE_KEY) {
    renderAccountSuggestions();
    renderTrades();
  }

  if (event.key === ACTIVE_ACCOUNT_KEY) {
    renderTrades();
  }
});

window.addEventListener('accountsUpdated', () => {
  renderAccountSuggestions();
  renderTrades();
});
window.addEventListener('activeAccountChanged', renderTrades);

renderAccountSuggestions();
renderTrades();
