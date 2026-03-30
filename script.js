const CAT_COLORS = {
    'Food': '#ff4d6d',
    'Transport': '#4cc9f0',
    'Social Life': '#ffb703',
    'Apparel': '#06d6a0',
    'Fine': '#f77f00',
    'Health': '#c77dff',
    'Entertainment': '#ff6b6b',
    'Other': '#8ecae6',
};

let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let budget = null;
let selectedCat = 'Food';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function storageKey() { return `spndxr_${currentYear}_${currentMonth}`; }
function budgetKey() { return `spndxr_budget_${currentYear}_${currentMonth}`; }

function getExpenses() {
    try { return JSON.parse(localStorage.getItem(storageKey())) || []; }
    catch { return []; }
}
function saveExpenses(arr) { localStorage.setItem(storageKey(), JSON.stringify(arr)); }
function getBudget() {
    const v = localStorage.getItem(budgetKey());
    return v ? parseFloat(v) : null;
}
function saveBudget(v) { localStorage.setItem(budgetKey(), v); }

function updateMonthDisplays() {
    const label = `${MONTHS_SHORT[currentMonth]} ${currentYear}`;
    const full = `${MONTHS[currentMonth]} ${currentYear}`;
    document.getElementById('monthLabel').textContent = label;
    document.getElementById('currentMonthDisplay').textContent = full;
    document.getElementById('txnMonthDisplay').textContent = full;
    document.getElementById('statsMonthDisplay').textContent = full;
    document.getElementById('statsMonthLabel').textContent = label;
    budget = getBudget();
    if (budget) document.getElementById('budgetInput').value = budget;
    else document.getElementById('budgetInput').value = '';
}

function totalSpent(expenses) { return expenses.reduce((s, e) => s + e.amount, 0); }

function aggregateCats(expenses) {
    const map = {};
    expenses.forEach(e => { map[e.cat] = (map[e.cat] || 0) + e.amount; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

function aggregateDays(expenses) {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const arr = Array(daysInMonth).fill(0);
    expenses.forEach(e => {
        const d = new Date(e.date);
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear)
            arr[d.getDate() - 1] += e.amount;
    });
    return arr;
}

function renderDashboard() {
    const expenses = getExpenses();
    const total = totalSpent(expenses);
    const cats = aggregateCats(expenses);
    const topCat = cats.length ? cats[0][0] : '—';

    document.getElementById('kpiSpent').textContent = `₹${total.toFixed(2)}`;
    document.getElementById('kpiCount').textContent = expenses.length;
    document.getElementById('kpiTop').textContent = topCat;
    document.getElementById('donutTotal').textContent = `₹${total.toFixed(0)}`;

    if (budget) {
        const left = budget - total;
        document.getElementById('kpiBudgetLeft').textContent = `₹${Math.max(0, left).toFixed(2)}`;
        const pct = Math.min(100, (total / budget) * 100);
        document.getElementById('kpiBudgetTag').textContent =
            left < 0 ? '⚠ Over budget!' : `${(100 - pct).toFixed(0)}% remaining`;
        document.getElementById('budgetBarSection').style.display = 'block';
        document.getElementById('budgetBarFill').style.width = pct + '%';
        document.getElementById('budgetBarPct').textContent = pct.toFixed(1) + '%';
    } else {
        document.getElementById('kpiBudgetLeft').textContent = '₹—';
        document.getElementById('kpiBudgetTag').textContent = 'set a budget';
        document.getElementById('budgetBarSection').style.display = 'none';
    }

    const catList = document.getElementById('catList');
    if (!cats.length) {
        catList.innerHTML = '<div class="cat-empty">No expenses yet.<br/>Hit <strong>+ Log Expense</strong> to start.</div>';
    } else {
        catList.innerHTML = cats.map(([cat, amt]) => {
            const pct = total ? ((amt / total) * 100).toFixed(1) : 0;
            const color = CAT_COLORS[cat] || '#888';
            return `
        <div class="cat-row">
          <div class="cat-row-bar-wrap">
            <div class="cat-row-top">
              <span class="cat-name">${cat}</span>
              <span class="cat-amount">₹${amt.toFixed(2)}</span>
            </div>
            <div class="cat-bar-track">
              <div class="cat-bar-fill" style="width:${pct}%;background:${color}"></div>
            </div>
          </div>
          <div class="cat-pct-badge">${pct}%</div>
        </div>`;
        }).join('');
    }

    drawDonut('donutChart', cats, total);
}

function renderTransactions() {
    const expenses = getExpenses();
    const total = totalSpent(expenses);
    const list = document.getElementById('txnList');

    document.getElementById('txnTotal').textContent = `₹${total.toFixed(2)}`;
    document.getElementById('txnCountDisplay').textContent = expenses.length;

    if (!expenses.length) {
        list.innerHTML = '<div class="cat-empty">No transactions this month.</div>';
        return;
    }

    const sorted = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
    list.innerHTML = sorted.map(e => {
        const color = CAT_COLORS[e.cat] || '#888';
        const d = new Date(e.date);
        const dateStr = `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
        return `
      <div class="txn-item">
        <div class="txn-dot" style="background:${color}"></div>
        <div class="txn-info">
          <div class="txn-cat">${e.cat}</div>
          <div class="txn-note">${e.note || '—'}</div>
        </div>
        <div class="txn-date">${dateStr}</div>
        <div class="txn-amount">₹${e.amount.toFixed(2)}</div>
        <button class="txn-delete" data-id="${e.id}" title="Delete">✕</button>
      </div>`;
    }).join('');

    list.querySelectorAll('.txn-delete').forEach(btn => {
        btn.addEventListener('click', () => deleteExpense(btn.dataset.id));
    });
}

function deleteExpense(id) {
    const expenses = getExpenses().filter(e => String(e.id) !== String(id));
    saveExpenses(expenses);
    renderAll();
    showToast('Expense removed.');
}

function renderStats() {
    const expenses = getExpenses();
    const cats = aggregateCats(expenses);
    const total = totalSpent(expenses);
    const daily = aggregateDays(expenses);

    drawBarChart('barChart', daily);
    drawDonut('statsDonut', cats, total);

    const insightEl = document.getElementById('insightList');
    if (!expenses.length) {
        insightEl.innerHTML = '<div class="cat-empty">No data yet.</div>';
        return;
    }

    const insights = [];
    const topCat = cats[0];
    const topPct = total ? ((topCat[1] / total) * 100).toFixed(0) : 0;
    insights.push({ text: `Your biggest spend is <strong>${topCat[0]}</strong> at ${topPct}% of total.`, cls: '' });

    const maxDay = daily.indexOf(Math.max(...daily)) + 1;
    if (Math.max(...daily) > 0)
        insights.push({ text: `You spent the most on <strong>day ${maxDay}</strong> this month.`, cls: 'yellow' });

    if (budget) {
        const left = budget - total;
        if (left < 0)
            insights.push({ text: `You're <strong>₹${Math.abs(left).toFixed(0)} over budget</strong>. Reign it in!`, cls: '' });
        else
            insights.push({ text: `You have <strong>₹${left.toFixed(0)}</strong> left in your budget.`, cls: 'green' });
    }

    if (cats.length >= 2) {
        const [c1, c2] = cats;
        insights.push({ text: `<strong>${c1[0]}</strong> vs <strong>${c2[0]}</strong>: ₹${c1[1].toFixed(0)} vs ₹${c2[1].toFixed(0)}.`, cls: 'yellow' });
    }

    const avg = total / new Date().getDate();
    insights.push({ text: `Daily average spend so far: <strong>₹${avg.toFixed(0)}</strong>.`, cls: 'green' });

    insightEl.innerHTML = insights.map(i =>
        `<div class="insight-item ${i.cls}">${i.text}</div>`
    ).join('');
}

function drawDonut(canvasId, cats, total) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    if (!cats.length) {
        ctx.strokeStyle = 'rgba(255,255,255,0.07)';
        ctx.lineWidth = 22;
        ctx.beginPath();
        ctx.arc(W / 2, H / 2, W / 2 - 22, 0, Math.PI * 2);
        ctx.stroke();
        return;
    }

    const cx = W / 2, cy = H / 2;
    const radius = W / 2 - 20;
    const innerR = radius * 0.58;
    let start = -Math.PI / 2;

    cats.forEach(([cat, amt]) => {
        const slice = (amt / total) * Math.PI * 2;
        const color = CAT_COLORS[cat] || '#888';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, start, start + slice);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        start += slice;
    });

    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fillStyle = '#111118';
    ctx.fill();
}

function drawBarChart(canvasId, daily) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const maxVal = Math.max(...daily, 1);
    const barW = Math.floor((W - 40) / daily.length - 2);
    const chartH = H - 30;
    const padL = 10;

    daily.forEach((val, i) => {
        const barH = (val / maxVal) * (chartH - 10);
        const x = padL + i * ((W - 40) / daily.length) + 2;
        const y = chartH - barH;
        const alpha = val > 0 ? 0.85 : 0.1;

        const grad = ctx.createLinearGradient(x, y, x, chartH);
        grad.addColorStop(0, `rgba(255,77,109,${alpha})`);
        grad.addColorStop(1, `rgba(255,77,109,0.1)`);

        ctx.fillStyle = grad;
        const r = Math.min(4, barW / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + barW - r, y);
        ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
        ctx.lineTo(x + barW, chartH);
        ctx.lineTo(x, chartH);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();

        if ((i + 1) % 5 === 0 || i === 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.font = '9px JetBrains Mono, monospace';
            ctx.textAlign = 'center';
            ctx.fillText(i + 1, x + barW / 2, H - 8);
        }
    });
}

function renderAll() {
    renderDashboard();
    renderTransactions();
    renderStats();
}

const overlay = document.getElementById('modalOverlay');

function openModal() {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    document.getElementById('dateInput').value = `${y}-${m}-${d}`;
    document.getElementById('amountInput').value = '';
    document.getElementById('noteInput').value = '';
    overlay.classList.add('open');
    setTimeout(() => document.getElementById('amountInput').focus(), 100);
}
function closeModal() { overlay.classList.remove('open'); }

document.getElementById('openModal').addEventListener('click', openModal);
document.getElementById('openModal2').addEventListener('click', openModal);
document.getElementById('closeModal').addEventListener('click', closeModal);
overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

document.querySelectorAll('.cat-chip').forEach(chip => {
    chip.addEventListener('click', () => {
        document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        selectedCat = chip.dataset.cat;
    });
});

document.getElementById('submitExpense').addEventListener('click', () => {
    const amount = parseFloat(document.getElementById('amountInput').value);
    const note = document.getElementById('noteInput').value.trim();
    const date = document.getElementById('dateInput').value;

    if (!amount || amount <= 0) { showToast('Please enter a valid amount.'); return; }
    if (!date) { showToast('Please pick a date.'); return; }

    const expenses = getExpenses();
    expenses.push({ id: Date.now(), amount, cat: selectedCat, note: note || '', date });
    saveExpenses(expenses);
    closeModal();
    renderAll();
    showToast(`₹${amount.toFixed(0)} logged under ${selectedCat} ✓`);
});

document.getElementById('prevMonth').addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    budget = getBudget();
    updateMonthDisplays();
    renderAll();
});
document.getElementById('nextMonth').addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    budget = getBudget();
    updateMonthDisplays();
    renderAll();
});

document.getElementById('setBudgetBtn').addEventListener('click', () => {
    const val = parseFloat(document.getElementById('budgetInput').value);
    if (!val || val <= 0) { showToast('Enter a valid budget.'); return; }
    budget = val;
    saveBudget(val);
    renderAll();
    showToast(`Budget set to ₹${val.toFixed(0)} ✓`);
});

document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const view = btn.dataset.view;
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(`view-${view}`).classList.add('active');
        if (view === 'stats') renderStats();
    });
});

let toastTimer;
function showToast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

budget = getBudget();
if (budget) document.getElementById('budgetInput').value = budget;
updateMonthDisplays();
renderAll();