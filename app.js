// State Initialization
let appData = JSON.parse(localStorage.getItem('finTrackData')) || {
  pin: '1234',
  transactions: [],
  khata: {}
};

let currentTxType = 'IN';
const denominations = [500, 200, 100, 50, 20, 10, 5, 2, 1];

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('currentDate').innerText = new Date().toDateString();
  initCalculator();
  refreshAllUI();
});

function saveData() {
  localStorage.setItem('finTrackData', JSON.stringify(appData));
  refreshAllUI();
}

// 1. AUTHENTICATION & SECURITY
function handleAuth() {
  const enteredPin = document.getElementById('pinInput').value;
  if (enteredPin === appData.pin) {
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('appContainer').style.display = 'block';
    document.getElementById('pinInput').value = '';
  } else {
    alert('Incorrect PIN! Default is 1234.');
  }
}

function lockApp() {
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('appContainer').style.display = 'none';
}

function updatePin() {
  const newPin = document.getElementById('newPinInput').value;
  if (newPin.length === 4 && !isNaN(newPin)) {
    appData.pin = newPin;
    saveData();
    document.getElementById('newPinInput').value = '';
    alert('Security PIN updated successfully!');
  } else {
    alert('Please enter a valid 4-digit numeric PIN.');
  }
}

// 2. NAVIGATION
function switchTab(tabName) {
  document.querySelectorAll('.tab-section').forEach(sec => sec.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  
  document.getElementById(`tab-${tabName}`).classList.add('active');
  document.getElementById(`nav-${tabName}`).classList.add('active');
}

// 3. CASHBOOK & INCOME/EXPENSE
function setTxType(type) {
  currentTxType = type;
  document.getElementById('btnTypeIn').className = type === 'IN' ? 'toggle-btn active-in' : 'toggle-btn';
  document.getElementById('btnTypeOut').className = type === 'OUT' ? 'toggle-btn active-out' : 'toggle-btn';
}

function addTransaction() {
  const amount = parseFloat(document.getElementById('txAmount').value);
  const desc = document.getElementById('txDesc').value.trim() || 'General Entry';
  const category = document.getElementById('txCategory').value;
  const mode = document.getElementById('txMode').value;

  if (!amount || amount <= 0) {
    alert('Please enter a valid amount.');
    return;
  }

  const tx = {
    id: Date.now(),
    type: currentTxType,
    amount,
    desc,
    category,
    mode,
    date: new Date().toLocaleDateString('en-IN')
  };

  appData.transactions.unshift(tx);
  document.getElementById('txAmount').value = '';
  document.getElementById('txDesc').value = '';
  saveData();
}

function deleteTransaction(id) {
  if (confirm('Delete this entry?')) {
    appData.transactions = appData.transactions.filter(t => t.id !== id);
    saveData();
  }
}

function renderCashbook() {
  const list = document.getElementById('cashbookList');
  const recentList = document.getElementById('recentTxList');
  const search = document.getElementById('searchTx').value.toLowerCase();
  const modeFilter = document.getElementById('filterMode').value;

  list.innerHTML = '';
  recentList.innerHTML = '';

  let totalIn = 0;
  let totalOut = 0;

  appData.transactions.forEach((tx, index) => {
    if (tx.type === 'IN') totalIn += tx.amount;
    else totalOut += tx.amount;

    const itemHTML = `
      <li class="tx-item">
        <div class="tx-info">
          <strong>${tx.desc}</strong>
          <small>${tx.date} • ${tx.category} (${tx.mode})</small>
        </div>
        <div style="text-align:right;">
          <strong class="${tx.type === 'IN' ? 'text-green' : 'text-red'}">
            ${tx.type === 'IN' ? '+' : '-'}₹${tx.amount.toLocaleString('en-IN')}
          </strong>
          <br>
          <small onclick="deleteTransaction(${tx.id})" style="color:#94a3b8; cursor:pointer;">Delete</small>
        </div>
      </li>
    `;

    // Render Recent 5 on Dashboard
    if (index < 5) recentList.innerHTML += itemHTML;

    // Render Filtered List on Cashbook
    const matchesSearch = tx.desc.toLowerCase().includes(search) || tx.category.toLowerCase().includes(search);
    const matchesMode = modeFilter === 'ALL' || tx.mode === modeFilter;
    if (matchesSearch && matchesMode) {
      list.innerHTML += itemHTML;
    }
  });

  document.getElementById('dashTotalIn').innerText = `₹${totalIn.toLocaleString('en-IN')}`;
  document.getElementById('dashTotalOut').innerText = `₹${totalOut.toLocaleString('en-IN')}`;
  document.getElementById('dashNetBalance').innerText = `₹${(totalIn - totalOut).toLocaleString('en-IN')}`;
}

// 4. UDHAR KHATA (CUSTOMER LEDGER)
function addKhataEntry(action) {
  const name = document.getElementById('khataName').value.trim();
  const phone = document.getElementById('khataPhone').value.trim();
  const amount = parseFloat(document.getElementById('khataAmount').value);
  const note = document.getElementById('khataNote').value.trim();

  if (!name || !amount || amount <= 0) {
    alert('Please enter Party Name and valid Amount.');
    return;
  }

  if (!appData.khata[name]) {
    appData.khata[name] = { phone: phone || '', balance: 0, history: [] };
  } else if (phone) {
    appData.khata[name].phone = phone;
  }

  // GAVE = Customer owes you (+), GOT = Customer paid you (-)
  if (action === 'GAVE') {
    appData.khata[name].balance += amount;
  } else {
    appData.khata[name].balance -= amount;
  }

  appData.khata[name].history.unshift({
    action,
    amount,
    note,
    date: new Date().toLocaleDateString('en-IN')
  });

  document.getElementById('khataName').value = '';
  document.getElementById('khataPhone').value = '';
  document.getElementById('khataAmount').value = '';
  document.getElementById('khataNote').value = '';
  saveData();
}

function renderKhata() {
  const container = document.getElementById('khataPartyList');
  container.innerHTML = '';

  let totalReceivable = 0;
  let totalPayable = 0;

  Object.keys(appData.khata).forEach(party => {
    const data = appData.khata[party];
    if (data.balance > 0) totalReceivable += data.balance;
    if (data.balance < 0) totalPayable += Math.abs(data.balance);

    const statusText = data.balance > 0 ? 'You will get' : (data.balance < 0 ? 'You will give' : 'Settled');
    const colorClass = data.balance > 0 ? 'text-green' : (data.balance < 0 ? 'text-red' : '');
    const waMessage = encodeURIComponent(`Hello ${party}, your pending balance on FinTrack Khata is ₹${Math.abs(data.balance)}.`);

    container.innerHTML += `
      <div class="party-card">
        <div>
          <strong>${party}</strong>
          <small style="display:block; color:#64748b;">${data.phone || 'No Phone'}</small>
          ${data.balance > 0 ? `<a href="https://wa.me/${data.phone}?text=${waMessage}" target="_blank"><button class="whatsapp-btn">WhatsApp Reminder</button></a>` : ''}
        </div>
        <div style="text-align:right;">
          <strong class="${colorClass}">₹${Math.abs(data.balance).toLocaleString('en-IN')}</strong>
          <small style="display:block; font-size:11px;">${statusText}</small>
        </div>
      </div>
    `;
  });

  document.getElementById('dashKhataReceive').innerText = `₹${totalReceivable.toLocaleString('en-IN')}`;
  document.getElementById('dashKhataPay').innerText = `₹${totalPayable.toLocaleString('en-IN')}`;
}

// 5. CASH DENOMINATION CALCULATOR
function initCalculator() {
  const container = document.getElementById('denomContainer');
  container.innerHTML = denominations.map(denom => `
    <div class="denom-row">
      <label>₹${denom} ×</label>
      <input type="number" min="0" id="denom-${denom}" oninput="calculateCash()" placeholder="0">
      <span id="sub-${denom}">₹0</span>
    </div>
  `).join('');
}

function calculateCash() {
  let grandTotal = 0;
  let totalNotes = 0;

  denominations.forEach(denom => {
    const count = parseInt(document.getElementById(`denom-${denom}`).value) || 0;
    const subTotal = denom * count;
    document.getElementById(`sub-${denom}`).innerText = `₹${subTotal.toLocaleString('en-IN')}`;
    grandTotal += subTotal;
    totalNotes += count;
  });

  document.getElementById('calcGrandTotal').innerText = `₹${grandTotal.toLocaleString('en-IN')}`;
  document.getElementById('calcTotalNotes').innerText = `Total Notes: ${totalNotes}`;
}

function resetCalculator() {
  denominations.forEach(denom => {
    document.getElementById(`denom-${denom}`).value = '';
    document.getElementById(`sub-${denom}`).innerText = '₹0';
  });
  calculateCash();
}

// 6. EXPORT & BACKUP
function exportDataCSV() {
  let csv = 'Date,Type,Category,Mode,Description,Amount\n';
  appData.transactions.forEach(t => {
    csv += `${t.date},${t.type},${t.category},${t.mode},"${t.desc}",${t.amount}\n`;
  });
  downloadFile(csv, 'FinTrack_Report.csv', 'text/csv');
}

function backupJSON() {
  downloadFile(JSON.stringify(appData), 'FinTrack_Backup.json', 'application/json');
}

function restoreJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      appData = JSON.parse(e.target.result);
      saveData();
      alert('Data restored successfully!');
    } catch (err) {
      alert('Invalid backup file.');
    }
  };
  reader.readAsText(file);
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

function refreshAllUI() {
  renderCashbook();
  renderKhata();
}