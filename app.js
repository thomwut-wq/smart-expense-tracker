/* Smart Expense Tracker — UI logic and LocalStorage persistence. */
(function () {
  "use strict";

  var STORAGE_KEY = "smart-expense-tracker:transactions";
  var CATEGORIES = window.ExpenseParser.CATEGORIES;

  // Colors used for category bars (Tailwind-ish hex values).
  var CATEGORY_COLORS = {
    Food: "#f97316",
    Travel: "#0ea5e9",
    Bills: "#ef4444",
    Shopping: "#a855f7",
    Entertainment: "#ec4899",
    Health: "#10b981",
    Income: "#22c55e",
    Other: "#64748b"
  };

  var state = { transactions: [] };

  // ---- Persistence -------------------------------------------------------
  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      state.transactions = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(state.transactions)) state.transactions = [];
    } catch (e) {
      state.transactions = [];
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.transactions));
    } catch (e) {
      /* storage full or unavailable — ignore */
    }
  }

  // ---- Helpers -----------------------------------------------------------
  function formatMoney(n) {
    return Number(n).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function formatDate(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, {
      day: "2-digit", month: "short", year: "numeric"
    });
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function el(id) { return document.getElementById(id); }

  // ---- Mutations ---------------------------------------------------------
  function addTransaction(tx) {
    state.transactions.unshift({
      id: uid(),
      type: tx.type,
      amount: Math.abs(Number(tx.amount)) || 0,
      category: tx.category || "Other",
      description: tx.description || "",
      date: tx.date || new Date().toISOString()
    });
    save();
    render();
  }

  function deleteTransaction(id) {
    state.transactions = state.transactions.filter(function (t) {
      return t.id !== id;
    });
    save();
    render();
  }

  // ---- Rendering ---------------------------------------------------------
  function render() {
    renderSummary();
    renderChart();
    renderTable();
  }

  function renderSummary() {
    var income = 0, expense = 0;
    state.transactions.forEach(function (t) {
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
    });
    var balance = income - expense;
    el("totalIncome").textContent = formatMoney(income);
    el("totalExpense").textContent = formatMoney(expense);
    var balanceEl = el("balance");
    balanceEl.textContent = formatMoney(balance);
    balanceEl.className = "mt-1 text-2xl font-bold " +
      (balance < 0 ? "text-rose-600" : "text-slate-900");
  }

  function renderChart() {
    var container = el("categoryChart");
    var totals = {};
    var grand = 0;
    state.transactions.forEach(function (t) {
      if (t.type !== "expense") return;
      totals[t.category] = (totals[t.category] || 0) + t.amount;
      grand += t.amount;
    });

    var cats = Object.keys(totals).sort(function (a, b) {
      return totals[b] - totals[a];
    });

    if (cats.length === 0 || grand === 0) {
      container.innerHTML = '<p class="text-sm text-slate-400">No expenses yet.</p>';
      return;
    }

    container.innerHTML = cats.map(function (cat) {
      var amt = totals[cat];
      var pct = Math.round((amt / grand) * 100);
      var color = CATEGORY_COLORS[cat] || "#64748b";
      return (
        '<div class="fade-in">' +
          '<div class="mb-1 flex items-center justify-between text-sm">' +
            '<span class="flex items-center gap-2 font-medium text-slate-700">' +
              '<span class="inline-block h-2.5 w-2.5 rounded-full" style="background:' + color + '"></span>' +
              cat +
            '</span>' +
            '<span class="text-slate-500">' + formatMoney(amt) + ' (' + pct + '%)</span>' +
          '</div>' +
          '<div class="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">' +
            '<div class="h-full rounded-full transition-all duration-500" style="width:' + pct + '%;background:' + color + '"></div>' +
          '</div>' +
        '</div>'
      );
    }).join("");
  }

  function renderTable() {
    var body = el("txBody");
    var empty = el("emptyState");
    var clearBtn = el("clearAllBtn");

    if (state.transactions.length === 0) {
      body.innerHTML = "";
      empty.classList.remove("hidden");
      clearBtn.classList.add("hidden");
      return;
    }
    empty.classList.add("hidden");
    clearBtn.classList.remove("hidden");

    body.innerHTML = state.transactions.map(function (t) {
      var isIncome = t.type === "income";
      var sign = isIncome ? "+" : "-";
      var amtClass = isIncome ? "text-emerald-600" : "text-rose-600";
      var color = CATEGORY_COLORS[t.category] || "#64748b";
      return (
        '<tr class="border-b border-slate-100 last:border-0 hover:bg-slate-50">' +
          '<td class="whitespace-nowrap px-2 py-2.5 text-slate-500">' + formatDate(t.date) + '</td>' +
          '<td class="px-2 py-2.5 text-slate-800">' + escapeHtml(t.description || "—") + '</td>' +
          '<td class="px-2 py-2.5">' +
            '<span class="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">' +
              '<span class="inline-block h-2 w-2 rounded-full" style="background:' + color + '"></span>' +
              escapeHtml(t.category) +
            '</span>' +
          '</td>' +
          '<td class="whitespace-nowrap px-2 py-2.5 text-right font-semibold ' + amtClass + '">' + sign + formatMoney(t.amount) + '</td>' +
          '<td class="px-2 py-2.5 text-right">' +
            '<button data-id="' + t.id + '" class="delete-btn rounded-md px-2 py-1 text-xs font-medium text-rose-500 transition hover:bg-rose-50" aria-label="Delete transaction">Delete</button>' +
          '</td>' +
        '</tr>'
      );
    }).join("");

    Array.prototype.forEach.call(body.querySelectorAll(".delete-btn"), function (btn) {
      btn.addEventListener("click", function () {
        deleteTransaction(btn.getAttribute("data-id"));
      });
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // ---- Smart input -------------------------------------------------------
  function showHint(message, ok) {
    var hint = el("smartHint");
    hint.textContent = message;
    hint.className = "mt-2 text-xs " + (ok ? "text-emerald-600" : "text-rose-600");
    hint.classList.remove("hidden");
  }

  function handleSmartParse() {
    var input = el("smartInput");
    var result = window.ExpenseParser.parse(input.value);
    if (!result) {
      showHint("Please type something like 'Spent 150 on lunch'.", false);
      return;
    }

    // Without an amount we can't save automatically — populate the manual form
    // so the user can fill in the missing amount and add it themselves.
    if (result.amount == null) {
      el("fType").value = result.type;
      el("fCategory").value = result.category;
      el("fDescription").value = result.description;
      el("fAmount").value = "";
      showHint("Parsed as " + result.type + " / " + result.category +
        ". Couldn't find an amount — please fill it in below and click \"Add Transaction\".", false);
      el("fAmount").focus();
      return;
    }

    // One-click: add the transaction straight from the parsed sentence.
    addTransaction({
      type: result.type,
      amount: result.amount,
      category: result.category,
      description: result.description
    });
    input.value = "";
    showHint("Added: " + result.type + " · " + result.category + " · " +
      formatMoney(result.amount) + ".", true);
  }

  // ---- Init --------------------------------------------------------------
  function populateCategorySelect() {
    var sel = el("fCategory");
    sel.innerHTML = CATEGORIES.map(function (c) {
      return '<option value="' + c + '">' + c + '</option>';
    }).join("");
  }

  function bindEvents() {
    el("smartParseBtn").addEventListener("click", handleSmartParse);
    el("smartInput").addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); handleSmartParse(); }
    });

    Array.prototype.forEach.call(document.querySelectorAll(".example-chip"), function (chip) {
      chip.addEventListener("click", function () {
        el("smartInput").value = chip.textContent.trim();
        handleSmartParse();
      });
    });

    el("manualForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var amount = parseFloat(el("fAmount").value);
      if (isNaN(amount) || amount <= 0) {
        el("fAmount").focus();
        return;
      }
      addTransaction({
        type: el("fType").value,
        amount: amount,
        category: el("fCategory").value,
        description: el("fDescription").value.trim()
      });
      el("manualForm").reset();
      el("fCategory").selectedIndex = 0;
      el("smartInput").value = "";
      el("smartHint").classList.add("hidden");
    });

    el("clearAllBtn").addEventListener("click", function () {
      if (state.transactions.length === 0) return;
      if (window.confirm("Delete all transactions? This cannot be undone.")) {
        state.transactions = [];
        save();
        render();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    populateCategorySelect();
    bindEvents();
    load();
    render();
  });
})();
