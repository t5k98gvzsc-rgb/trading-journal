const ACCOUNT_STORAGE_KEY = 'tradingJournalAccounts';
const ACTIVE_ACCOUNT_KEY = 'tradingJournalActiveAccount';
const TRADE_STORAGE_KEYS = ['tradingJournalTrades', 'trades'];

const currencySymbols = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$'
};

let accounts = [];

const $ = (id) => document.getElementById(id);
const form = $('accountForm');
const modal = $('accountModal');
const grid = $('accountsGrid');
const emptyState = $('emptyState');

function loadAccounts() {
  try {
    accounts = JSON.parse(localStorage.getItem(ACCOUNT_STORAGE_KEY)) || [];
  } catch {
    accounts = [];
  }
}

function saveAccounts() {
  localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(accounts));
  window.dispatchEvent(new Event('accountsUpdated'));
  window.dispatchEvent(new StorageEvent('storage', { key: ACCOUNT_STORAGE_KEY }));
}

function getActiveAccount() {
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

function setActiveAccount(account) {
  if (!account) return;
  localStorage.setItem(ACTIVE_ACCOUNT_KEY, JSON.stringify({ id: account.id, name: account.name, currency: account.currency }));

  window.dispatchEvent(new Event('activeAccountChanged'));
  window.dispatchEvent(new StorageEvent('storage', { key: ACTIVE_ACCOUNT_KEY }));
  renderAccounts();
}

function loadTrades() {
  for (const key of TRADE_STORAGE_KEYS) {
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      if (Array.isArray(saved)) return saved;
    } catch {}
  }
  return [];
}

function money(value, currency = 'USD') {
  const symbol = currencySymbols[currency] || `${currency} `;
  const number = Number(value) || 0;
  const sign = number < 0 ? '-' : '';
  return `${sign}${symbol}${Math.abs(number).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function getPnl(trade) {
  return Number(trade.pnl ?? trade.profitLoss ?? trade.profit ?? 0) || 0;
}

function accountTrades(accountName) {
  return loadTrades().filter((trade) => String(trade.account || '').trim() === accountName);
}

function accountMetrics(account) {
  const trades = accountTrades(account.name);
  const pnl = trades.reduce((sum, trade) => sum + getPnl(trade), 0);
  const wins = trades.filter((trade) => getPnl(trade) > 0).length;
  const losses = trades.filter((trade) => getPnl(trade) < 0).length;
  const grossWin = trades.reduce((sum, trade) => sum + Math.max(getPnl(trade), 0), 0);
  const grossLoss = Math.abs(trades.reduce((sum, trade) => sum + Math.min(getPnl(trade), 0), 0));
  const winRate = trades.length ? (wins / trades.length) * 100 : 0;
  const profitFactor = grossLoss === 0 ? (grossWin > 0 ? grossWin : 0) : grossWin / grossLoss;

  return {
    trades: trades.length,
    pnl,
    wins,
    losses,
    winRate,
    profitFactor,
    currentBalance: (Number(account.startingBalance) || 0) + pnl
  };
}

function pnlClass(value) {
  return value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral';
}

function openModal(account = null) {
  form.reset();
  $('accountId').value = account?.id || '';
  $('modalTitle').textContent = account ? 'Edit Account' : 'Add Account';

  if (account) {
    $('accountName').value = account.name || '';
    $('currency').value = account.currency || 'USD';
    $('startingBalance').value = account.startingBalance || '';
  }

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  $('accountName').focus();
}

function closeModal() {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

function renderAccounts() {
  const active = getActiveAccount();

  const accountCards = accounts.map((account) => {
    const stats = accountMetrics(account);
    const isActive = active?.id === account.id || active?.name === account.name;
    return `
      <article class="account-card ${isActive ? 'active-account' : ''}" data-select-account="${account.id}" tabindex="0" role="button" aria-label="Show ${escapeHtml(account.name)} account data">
        <div class="account-top">
          <div>
            <h3>${escapeHtml(account.name)}</h3>
            <span class="account-pill">${escapeHtml(account.currency)}</span>
          </div>
        </div>

        <div class="account-money">
          <div class="money-box">
            <span>Current Balance</span>
            <strong>${money(stats.currentBalance, account.currency)}</strong>
          </div>
          <div class="money-box">
            <span>Total P&L</span>
            <strong class="${pnlClass(stats.pnl)}">${money(stats.pnl, account.currency)}</strong>
          </div>
        </div>

        <div class="account-stats">
          <div class="stat-box">
            <span>Starting Balance</span>
            <strong>${money(account.startingBalance, account.currency)}</strong>
          </div>
          <div class="stat-box">
            <span>Trades</span>
            <strong>${stats.trades}</strong>
          </div>
          <div class="stat-box">
            <span>Win Rate</span>
            <strong>${stats.winRate.toFixed(0)}%</strong>
          </div>
          <div class="stat-box">
            <span>Wins / Losses</span>
            <strong>${stats.wins}/${stats.losses}</strong>
          </div>
          <div class="stat-box">
            <span>Profit Factor</span>
            <strong>${stats.profitFactor ? stats.profitFactor.toFixed(2) : '0.00'}</strong>
          </div>
        </div>

        <div class="account-actions">
          <button class="card-action edit-action" type="button" data-edit="${account.id}">Edit</button>
          <button class="card-action delete-action" type="button" data-delete="${account.id}">Delete</button>
        </div>
      </article>
    `;
  }).join('');

  grid.innerHTML = accountCards;
  emptyState.style.display = accounts.length ? 'none' : 'block';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const id = $('accountId').value || crypto.randomUUID();
  const account = {
    id,
    name: $('accountName').value.trim(),
    currency: $('currency').value,
    startingBalance: Number($('startingBalance').value) || 0,
    createdAt: new Date().toISOString()
  };

  const existingAccount = accounts.find((item) => item.id === id);
  const relatedTrades = accountTrades(account.name);
  const totalPnl = relatedTrades.reduce((sum, trade) => sum + getPnl(trade), 0);
  account.totalPnl = totalPnl;
  account.currentBalance = account.startingBalance + totalPnl;

  if (existingAccount) {
    account.createdAt = existingAccount.createdAt || account.createdAt;
  }

  if (!account.name) return;

  const duplicate = accounts.find((item) => item.name.toLowerCase() === account.name.toLowerCase() && item.id !== id);
  if (duplicate) {
    alert('An account with this name already exists.');
    return;
  }

  const existingIndex = accounts.findIndex((item) => item.id === id);
  if (existingIndex >= 0) accounts[existingIndex] = { ...accounts[existingIndex], ...account };
  else accounts.push(account);

  saveAccounts();
  closeModal();
  renderAccounts();
});

$('openAccountModal').addEventListener('click', () => openModal());
$('closeAccountModal').addEventListener('click', closeModal);
$('cancelAccountForm').addEventListener('click', closeModal);
modal.addEventListener('click', (event) => {
  if (event.target === modal) closeModal();
});

grid.addEventListener('click', (event) => {
  const actionButton = event.target.closest('button');
  const card = event.target.closest('[data-select-account]');

  if (!actionButton && card?.dataset.selectAccount) {
    const account = accounts.find((item) => item.id === card.dataset.selectAccount);
    if (account) setActiveAccount(account);
    return;
  }

  const editId = event.target.dataset.edit;
  const deleteId = event.target.dataset.delete;

  if (editId) {
    const account = accounts.find((item) => item.id === editId);
    if (account) openModal(account);
  }

  if (deleteId) {
    const account = accounts.find((item) => item.id === deleteId);
    if (!account) return;

    const hasTrades = accountTrades(account.name).length > 0;
    const message = hasTrades
      ? 'This account already has trades. Delete it anyway? Existing trades will keep the account name.'
      : 'Delete this account?';

    if (confirm(message)) {
      accounts = accounts.filter((item) => item.id !== deleteId);
      const active = getActiveAccount();
      if (active?.id === deleteId || active?.name === account.name) {
        const nextAccount = accounts[0] || null;
        if (nextAccount) localStorage.setItem(ACTIVE_ACCOUNT_KEY, JSON.stringify({ id: nextAccount.id, name: nextAccount.name, currency: nextAccount.currency }));
        else localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
      }
      saveAccounts();
      renderAccounts();
    }
  }
});


grid.addEventListener('keydown', (event) => {
  if (!['Enter', ' '].includes(event.key)) return;
  const card = event.target.closest('[data-select-account]');
  if (!card) return;
  event.preventDefault();

  const account = accounts.find((item) => item.id === card.dataset.selectAccount);
  if (account) setActiveAccount(account);
});

window.addEventListener('storage', () => {
  loadAccounts();
  renderAccounts();
});

loadAccounts();
const firstActiveAccount = getActiveAccount();
if (firstActiveAccount) localStorage.setItem(ACTIVE_ACCOUNT_KEY, JSON.stringify({ id: firstActiveAccount.id, name: firstActiveAccount.name, currency: firstActiveAccount.currency }));
renderAccounts();
