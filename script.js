const categoriesByType = {
  expense: ["Food", "Transport", "Housing", "Utilities", "Health", "Shopping", "Entertainment", "Education", "Travel", "Other"],
  income: ["Salary", "Freelance", "Business", "Investment", "Gift", "Refund", "Other"],
};

const storageKeys = {
  transactions: "ledgerleaf-transactions",
  budget: "ledgerleaf-budget",
  planner: "ledgerleaf-planner",
};

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
});

const plannerDefaults = {
  incomeTarget: 0,
  savingsTarget: 0,
  emergencyTarget: 0,
  goalName: "",
  goalAmount: 0,
  goalMonth: "",
};

const state = {
  transactions: [],
  budget: 0,
  planner: { ...plannerDefaults },
  editingId: null,
  filters: {
    search: "",
    type: "all",
    category: "all",
    month: "",
  },
};

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatCurrency(value) {
  return currencyFormatter.format(value || 0);
}

function formatDisplayDate(value) {
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function getMonthLabel(monthKey) {
  const date = new Date(`${monthKey}-01T00:00:00`);
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function loadState() {
  const transactions = loadJson(storageKeys.transactions, []);
  state.transactions = Array.isArray(transactions) ? transactions : [];
  state.budget = Number(localStorage.getItem(storageKeys.budget) || 0) || 0;
  state.planner = { ...plannerDefaults, ...loadJson(storageKeys.planner, plannerDefaults) };
}

function saveTransactions() {
  localStorage.setItem(storageKeys.transactions, JSON.stringify(state.transactions));
}

function saveBudget() {
  localStorage.setItem(storageKeys.budget, String(state.budget));
}

function savePlanner() {
  localStorage.setItem(storageKeys.planner, JSON.stringify(state.planner));
}

function seedDemoData() {
  if (state.transactions.length) {
    return;
  }

  const currentMonth = getTodayString().slice(0, 7);
  const previousMonthDate = new Date(`${currentMonth}-01T00:00:00`);
  previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
  const previousMonth = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, "0")}`;

  state.transactions = [
    { id: createId(), title: "Monthly salary", amount: 72000, type: "income", category: "Salary", date: `${currentMonth}-01`, paymentMethod: "Bank Transfer", notes: "Primary salary credit" },
    { id: createId(), title: "Freelance payout", amount: 8500, type: "income", category: "Freelance", date: `${currentMonth}-14`, paymentMethod: "Bank Transfer", notes: "Landing page project" },
    { id: createId(), title: "Groceries", amount: 3850, type: "expense", category: "Food", date: `${currentMonth}-05`, paymentMethod: "UPI", notes: "Weekly household shopping" },
    { id: createId(), title: "Internet bill", amount: 999, type: "expense", category: "Utilities", date: `${currentMonth}-08`, paymentMethod: "Card", notes: "Home broadband" },
    { id: createId(), title: "Metro recharge", amount: 1200, type: "expense", category: "Transport", date: `${currentMonth}-10`, paymentMethod: "Wallet", notes: "Monthly commute top-up" },
    { id: createId(), title: "Rent", amount: 18000, type: "expense", category: "Housing", date: `${currentMonth}-03`, paymentMethod: "Bank Transfer", notes: "Apartment rent" },
    { id: createId(), title: "Shopping run", amount: 2750, type: "expense", category: "Shopping", date: `${previousMonth}-11`, paymentMethod: "Card", notes: "Clothing and essentials" },
    { id: createId(), title: "Salary", amount: 70000, type: "income", category: "Salary", date: `${previousMonth}-01`, paymentMethod: "Bank Transfer", notes: "Previous month salary" },
    { id: createId(), title: "Dinner outing", amount: 1450, type: "expense", category: "Food", date: `${previousMonth}-16`, paymentMethod: "UPI", notes: "Weekend dinner" },
  ];

  state.budget = 30000;
  state.planner = {
    incomeTarget: 75000,
    savingsTarget: 20000,
    emergencyTarget: 150000,
    goalName: "Laptop Upgrade",
    goalAmount: 90000,
    goalMonth: currentMonth,
  };

  saveTransactions();
  saveBudget();
  savePlanner();
}

function computeTotals(transactions) {
  return transactions.reduce((totals, transaction) => {
    if (transaction.type === "income") {
      totals.income += transaction.amount;
    } else {
      totals.expenses += transaction.amount;
    }
    return totals;
  }, { income: 0, expenses: 0 });
}

function getMonthTransactions(monthKey) {
  return state.transactions.filter((transaction) => transaction.date.startsWith(monthKey));
}

function getExpenseTransactions(monthKey) {
  return getMonthTransactions(monthKey).filter((transaction) => transaction.type === "expense");
}

function getCategoryTotals(transactions) {
  return transactions.reduce((totals, transaction) => {
    totals[transaction.category] = (totals[transaction.category] || 0) + transaction.amount;
    return totals;
  }, {});
}

function getPaymentMethodTotals(transactions) {
  return transactions.reduce((totals, transaction) => {
    totals[transaction.paymentMethod] = (totals[transaction.paymentMethod] || 0) + transaction.amount;
    return totals;
  }, {});
}

function getMonthlyBuckets(monthCount = 6) {
  const start = new Date(`${getTodayString().slice(0, 7)}-01T00:00:00`);
  const buckets = [];
  for (let index = monthCount - 1; index >= 0; index -= 1) {
    const date = new Date(start);
    date.setMonth(date.getMonth() - index);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const totals = computeTotals(getMonthTransactions(key));
    buckets.push({ key, ...totals, net: totals.income - totals.expenses });
  }
  return buckets;
}

function calculateAverageMonthlySavings(monthCount = 3) {
  const buckets = getMonthlyBuckets(monthCount);
  if (!buckets.length) {
    return 0;
  }
  return buckets.reduce((sum, bucket) => sum + bucket.net, 0) / buckets.length;
}

function setInsightCollection(target, entries, emptyText) {
  target.innerHTML = "";
  if (!entries.length) {
    target.innerHTML = `<p class="empty-state">${emptyText}</p>`;
    return;
  }
  entries.forEach((entry) => target.appendChild(entry));
}

function createMetricCard(template, label, value, percent) {
  const fragment = template.content.cloneNode(true);
  fragment.querySelector(".insight-category").textContent = label;
  fragment.querySelector(".insight-value").textContent = value;
  fragment.querySelector(".insight-bar").style.width = `${Math.max(0, Math.min(percent, 100))}%`;
  return fragment;
}

function initializeDashboard() {
  const form = document.getElementById("transactionForm");
  if (!form) {
    return;
  }

  const elements = {
    form,
    budgetForm: document.getElementById("budgetForm"),
    title: document.getElementById("title"),
    amount: document.getElementById("amount"),
    type: document.getElementById("type"),
    category: document.getElementById("category"),
    date: document.getElementById("date"),
    paymentMethod: document.getElementById("paymentMethod"),
    notes: document.getElementById("notes"),
    budgetInput: document.getElementById("budgetInput"),
    formTitle: document.getElementById("formTitle"),
    submitBtn: document.getElementById("submitBtn"),
    cancelEditBtn: document.getElementById("cancelEditBtn"),
    totalBalance: document.getElementById("totalBalance"),
    totalIncome: document.getElementById("totalIncome"),
    totalExpenses: document.getElementById("totalExpenses"),
    transactionCount: document.getElementById("transactionCount"),
    heroNet: document.getElementById("heroNet"),
    heroIncome: document.getElementById("heroIncome"),
    heroExpense: document.getElementById("heroExpense"),
    budgetStatus: document.getElementById("budgetStatus"),
    budgetSpent: document.getElementById("budgetSpent"),
    budgetMeta: document.getElementById("budgetMeta"),
    budgetBar: document.getElementById("budgetBar"),
    searchInput: document.getElementById("searchInput"),
    filterType: document.getElementById("filterType"),
    filterCategory: document.getElementById("filterCategory"),
    filterMonth: document.getElementById("filterMonth"),
    transactionList: document.getElementById("transactionList"),
    insightsList: document.getElementById("insightsList"),
    transactionItemTemplate: document.getElementById("transactionItemTemplate"),
    insightItemTemplate: document.getElementById("insightItemTemplate"),
    smartSummary: document.getElementById("smartSummary"),
    largestExpenseLabel: document.getElementById("largestExpenseLabel"),
    topCategoryLabel: document.getElementById("topCategoryLabel"),
    savingsRateLabel: document.getElementById("savingsRateLabel"),
  };

  function updateCategoryOptions(selectedType, selectedCategory = "") {
    const categories = categoriesByType[selectedType];
    elements.category.innerHTML = categories.map((category) => `<option value="${category}">${category}</option>`).join("");
    if (selectedCategory && categories.includes(selectedCategory)) {
      elements.category.value = selectedCategory;
    }
  }

  function updateFilterCategoryOptions() {
    const categories = [...new Set(state.transactions.map((item) => item.category))].sort((a, b) => a.localeCompare(b));
    const current = state.filters.category;
    elements.filterCategory.innerHTML = [`<option value="all">All categories</option>`, ...categories.map((item) => `<option value="${item}">${item}</option>`)].join("");
    elements.filterCategory.value = categories.includes(current) ? current : "all";
    state.filters.category = elements.filterCategory.value;
  }

  function getFilteredTransactions() {
    return [...state.transactions]
      .filter((transaction) => {
        const haystack = `${transaction.title} ${transaction.notes} ${transaction.paymentMethod}`.toLowerCase();
        const matchesSearch = haystack.includes(state.filters.search.toLowerCase());
        const matchesType = state.filters.type === "all" || transaction.type === state.filters.type;
        const matchesCategory = state.filters.category === "all" || transaction.category === state.filters.category;
        const matchesMonth = !state.filters.month || transaction.date.startsWith(state.filters.month);
        return matchesSearch && matchesType && matchesCategory && matchesMonth;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  function renderBudget(monthExpenseTotal) {
    elements.budgetInput.value = state.budget || "";
    elements.budgetSpent.textContent = `${formatCurrency(monthExpenseTotal)} spent`;
    if (!state.budget) {
      elements.budgetStatus.textContent = "No budget set yet";
      elements.budgetMeta.textContent = "Set a budget to see how your expenses compare this month.";
      elements.budgetBar.style.width = "0%";
      return;
    }
    const percent = Math.min((monthExpenseTotal / state.budget) * 100, 100);
    const remaining = state.budget - monthExpenseTotal;
    elements.budgetBar.style.width = `${percent}%`;
    elements.budgetStatus.textContent = remaining < 0 ? "Budget exceeded" : "Budget on track";
    elements.budgetMeta.textContent = remaining < 0
      ? `${formatCurrency(Math.abs(remaining))} over your monthly budget.`
      : `${formatCurrency(remaining)} left in your monthly budget.`;
  }

  function renderStats() {
    const overallTotals = computeTotals(state.transactions);
    const monthKey = state.filters.month || getTodayString().slice(0, 7);
    const monthTransactions = getMonthTransactions(monthKey);
    const monthTotals = computeTotals(monthTransactions);
    const monthExpenseTransactions = monthTransactions.filter((item) => item.type === "expense");
    const categoryTotals = getCategoryTotals(monthExpenseTransactions);
    const topCategoryEntry = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
    const biggestExpense = [...monthExpenseTransactions].sort((a, b) => b.amount - a.amount)[0];
    const savingsRate = monthTotals.income ? ((monthTotals.income - monthTotals.expenses) / monthTotals.income) * 100 : 0;

    elements.totalIncome.textContent = formatCurrency(overallTotals.income);
    elements.totalExpenses.textContent = formatCurrency(overallTotals.expenses);
    elements.totalBalance.textContent = formatCurrency(overallTotals.income - overallTotals.expenses);
    elements.transactionCount.textContent = String(getFilteredTransactions().length);
    elements.heroNet.textContent = formatCurrency(monthTotals.income - monthTotals.expenses);
    elements.heroIncome.textContent = formatCurrency(monthTotals.income);
    elements.heroExpense.textContent = formatCurrency(monthTotals.expenses);
    elements.smartSummary.textContent = monthTotals.expenses > monthTotals.income
      ? "Spending is currently ahead of income this month. A closer look at reports may help."
      : `You have kept ${formatCurrency(monthTotals.income - monthTotals.expenses)} as net room this month.`;
    elements.largestExpenseLabel.textContent = biggestExpense ? `${biggestExpense.title} | ${formatCurrency(biggestExpense.amount)}` : "No expenses yet";
    elements.topCategoryLabel.textContent = topCategoryEntry ? `${topCategoryEntry[0]} | ${formatCurrency(topCategoryEntry[1])}` : "Waiting for data";
    elements.savingsRateLabel.textContent = `${Math.max(0, savingsRate).toFixed(1)}%`;
    renderBudget(monthTotals.expenses);
  }

  function renderTransactions() {
    const transactions = getFilteredTransactions();
    elements.transactionList.innerHTML = "";
    if (!transactions.length) {
      elements.transactionList.innerHTML = `<p class="empty-state">No transactions match the current filters yet.</p>`;
      return;
    }

    transactions.forEach((transaction) => {
      const fragment = elements.transactionItemTemplate.content.cloneNode(true);
      fragment.querySelector(".transaction-title").textContent = transaction.title;
      const amount = fragment.querySelector(".transaction-amount");
      amount.textContent = `${transaction.type === "income" ? "+" : "-"}${formatCurrency(transaction.amount)}`;
      amount.classList.add(transaction.type);
      fragment.querySelector(".transaction-meta").textContent = `${transaction.category} | ${transaction.paymentMethod} | ${formatDisplayDate(transaction.date)}`;
      fragment.querySelector(".transaction-notes").textContent = transaction.notes || "";
      fragment.querySelector(".edit-btn").addEventListener("click", () => startEditing(transaction.id));
      fragment.querySelector(".delete-btn").addEventListener("click", () => deleteTransaction(transaction.id));
      elements.transactionList.appendChild(fragment);
    });
  }

  function renderInsights() {
    const monthKey = state.filters.month || getTodayString().slice(0, 7);
    const totalsByCategory = getCategoryTotals(getExpenseTransactions(monthKey));
    const highestValue = Math.max(0, ...Object.values(totalsByCategory));
    const entries = Object.entries(totalsByCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([category, total]) => createMetricCard(elements.insightItemTemplate, category, formatCurrency(total), highestValue ? (total / highestValue) * 100 : 0));
    setInsightCollection(elements.insightsList, entries, "Add expenses for this month to see category breakdowns here.");
  }

  function resetForm() {
    state.editingId = null;
    elements.form.reset();
    elements.formTitle.textContent = "Add a new entry";
    elements.submitBtn.textContent = "Save transaction";
    elements.cancelEditBtn.classList.add("hidden");
    elements.type.value = "expense";
    elements.paymentMethod.value = "UPI";
    elements.date.value = getTodayString();
    updateCategoryOptions("expense");
  }

  function refresh() {
    updateFilterCategoryOptions();
    renderStats();
    renderTransactions();
    renderInsights();
  }

  function startEditing(transactionId) {
    const transaction = state.transactions.find((item) => item.id === transactionId);
    if (!transaction) {
      return;
    }
    state.editingId = transaction.id;
    elements.formTitle.textContent = "Edit transaction";
    elements.submitBtn.textContent = "Update transaction";
    elements.cancelEditBtn.classList.remove("hidden");
    elements.title.value = transaction.title;
    elements.amount.value = transaction.amount;
    elements.type.value = transaction.type;
    updateCategoryOptions(transaction.type, transaction.category);
    elements.date.value = transaction.date;
    elements.paymentMethod.value = transaction.paymentMethod;
    elements.notes.value = transaction.notes;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteTransaction(transactionId) {
    const transaction = state.transactions.find((item) => item.id === transactionId);
    if (!transaction || !window.confirm(`Delete "${transaction.title}"?`)) {
      return;
    }
    state.transactions = state.transactions.filter((item) => item.id !== transactionId);
    saveTransactions();
    if (state.editingId === transactionId) {
      resetForm();
    }
    refresh();
  }

  elements.type.addEventListener("change", (event) => updateCategoryOptions(event.target.value));
  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(elements.form);
    const transaction = {
      id: state.editingId || createId(),
      title: String(formData.get("title")).trim(),
      amount: Number(formData.get("amount")),
      type: String(formData.get("type")),
      category: String(formData.get("category")),
      date: String(formData.get("date")),
      paymentMethod: String(formData.get("paymentMethod")),
      notes: String(formData.get("notes")).trim(),
    };
    if (!transaction.title || !transaction.amount || !transaction.date) {
      return;
    }
    if (state.editingId) {
      state.transactions = state.transactions.map((item) => item.id === state.editingId ? transaction : item);
    } else {
      state.transactions.push(transaction);
    }
    saveTransactions();
    resetForm();
    refresh();
  });

  elements.budgetForm.addEventListener("submit", (event) => {
    event.preventDefault();
    state.budget = Math.max(0, Number(elements.budgetInput.value) || 0);
    saveBudget();
    refresh();
  });

  elements.cancelEditBtn.addEventListener("click", resetForm);
  elements.searchInput.addEventListener("input", (event) => { state.filters.search = event.target.value; renderTransactions(); renderStats(); });
  elements.filterType.addEventListener("change", (event) => { state.filters.type = event.target.value; renderTransactions(); renderStats(); });
  elements.filterCategory.addEventListener("change", (event) => { state.filters.category = event.target.value; renderTransactions(); renderStats(); });
  elements.filterMonth.addEventListener("change", (event) => { state.filters.month = event.target.value; refresh(); });

  state.filters.month = getTodayString().slice(0, 7);
  elements.filterMonth.value = state.filters.month;
  elements.date.value = getTodayString();
  updateCategoryOptions("expense");
  refresh();
}

function initializeReports() {
  const reportsMonth = document.getElementById("reportsMonth");
  if (!reportsMonth) {
    return;
  }

  const monthKey = getTodayString().slice(0, 7);
  const metricTemplate = document.getElementById("metricItemTemplate");
  const expenseTemplate = document.getElementById("expenseItemTemplate");
  reportsMonth.value = monthKey;

  function render() {
    const selectedMonth = reportsMonth.value || monthKey;
    const monthTransactions = getMonthTransactions(selectedMonth);
    const totals = computeTotals(monthTransactions);
    const expenseTransactions = monthTransactions.filter((item) => item.type === "expense");
    const averageExpense = expenseTransactions.length ? totals.expenses / expenseTransactions.length : 0;
    const categoryTotals = getCategoryTotals(expenseTransactions);
    const paymentMethodTotals = getPaymentMethodTotals(monthTransactions);
    const highestCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
    const savingsRate = totals.income ? ((totals.income - totals.expenses) / totals.income) * 100 : 0;

    document.getElementById("reportNet").textContent = formatCurrency(totals.income - totals.expenses);
    document.getElementById("reportAverageExpense").textContent = formatCurrency(averageExpense);
    document.getElementById("reportTopCategory").textContent = highestCategory ? highestCategory[0] : "None";
    document.getElementById("reportSavingsRate").textContent = `${Math.max(0, savingsRate).toFixed(1)}%`;

    const monthlyTable = document.getElementById("monthlyTable");
    monthlyTable.innerHTML = `<div class="table-head"><span>Month</span><span>Income</span><span>Expenses</span><span>Net</span></div>`;
    getMonthlyBuckets(6).forEach((bucket) => {
      monthlyTable.innerHTML += `<div class="table-row"><span>${getMonthLabel(bucket.key)}</span><span>${formatCurrency(bucket.income)}</span><span>${formatCurrency(bucket.expenses)}</span><span>${formatCurrency(bucket.net)}</span></div>`;
    });

    const paymentEntries = Object.entries(paymentMethodTotals).sort((a, b) => b[1] - a[1]);
    const paymentMax = Math.max(0, ...paymentEntries.map((entry) => entry[1]));
    const paymentNodes = paymentEntries.map(([label, total]) => createMetricCard(metricTemplate, label, formatCurrency(total), paymentMax ? (total / paymentMax) * 100 : 0));
    setInsightCollection(document.getElementById("paymentMethodList"), paymentNodes, "No payment data for this month yet.");

    const categoryEntries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    const categoryMax = Math.max(0, ...categoryEntries.map((entry) => entry[1]));
    const categoryNodes = categoryEntries.map(([label, total]) => createMetricCard(metricTemplate, label, formatCurrency(total), categoryMax ? (total / categoryMax) * 100 : 0));
    setInsightCollection(document.getElementById("reportsCategoryList"), categoryNodes, "No expenses available for this month.");

    const largestExpensesList = document.getElementById("largestExpensesList");
    largestExpensesList.innerHTML = "";
    const largestExpenses = [...expenseTransactions].sort((a, b) => b.amount - a.amount).slice(0, 5);
    if (!largestExpenses.length) {
      largestExpensesList.innerHTML = `<p class="empty-state">No expenses available for this month.</p>`;
    } else {
      largestExpenses.forEach((transaction) => {
        const fragment = expenseTemplate.content.cloneNode(true);
        fragment.querySelector(".transaction-title").textContent = transaction.title;
        fragment.querySelector(".transaction-amount").textContent = formatCurrency(transaction.amount);
        fragment.querySelector(".transaction-meta").textContent = `${transaction.category} | ${transaction.paymentMethod} | ${formatDisplayDate(transaction.date)}`;
        fragment.querySelector(".transaction-notes").textContent = transaction.notes || "";
        largestExpensesList.appendChild(fragment);
      });
    }
  }

  reportsMonth.addEventListener("change", render);
  render();
}

function initializePlanner() {
  const plannerForm = document.getElementById("plannerForm");
  if (!plannerForm) {
    return;
  }

  const fields = {
    incomeTarget: document.getElementById("plannerIncomeTarget"),
    savingsTarget: document.getElementById("plannerSavingsTarget"),
    emergencyTarget: document.getElementById("plannerEmergencyTarget"),
    goalName: document.getElementById("plannerGoalName"),
    goalAmount: document.getElementById("plannerGoalAmount"),
    goalMonth: document.getElementById("plannerGoalMonth"),
  };

  function syncForm() {
    fields.incomeTarget.value = state.planner.incomeTarget || "";
    fields.savingsTarget.value = state.planner.savingsTarget || "";
    fields.emergencyTarget.value = state.planner.emergencyTarget || "";
    fields.goalName.value = state.planner.goalName || "";
    fields.goalAmount.value = state.planner.goalAmount || "";
    fields.goalMonth.value = state.planner.goalMonth || "";
  }

  function renderPlanner() {
    const avgSavings = calculateAverageMonthlySavings(3);
    const spendCap = Math.max(0, (state.planner.incomeTarget || 0) - (state.planner.savingsTarget || 0));
    const currentBalance = computeTotals(state.transactions);
    const netBalance = currentBalance.income - currentBalance.expenses;
    const goalAmount = Number(state.planner.goalAmount) || 0;
    const progressPercent = goalAmount ? Math.min((Math.max(netBalance, 0) / goalAmount) * 100, 100) : 0;

    document.getElementById("plannerAvgSavings").textContent = formatCurrency(avgSavings);
    document.getElementById("plannerSpendCap").textContent = formatCurrency(spendCap);
    document.getElementById("plannerTimeline").textContent = state.planner.goalMonth
      ? `${state.planner.goalName || "Goal"} by ${getMonthLabel(state.planner.goalMonth)}`
      : "Set a plan";

    document.getElementById("plannerGoalLabel").textContent = state.planner.goalName || "No goal yet";
    document.getElementById("plannerGoalProgress").textContent = goalAmount ? `${formatCurrency(Math.max(netBalance, 0))} / ${formatCurrency(goalAmount)}` : formatCurrency(0);
    document.getElementById("plannerGoalBar").style.width = `${progressPercent}%`;
    document.getElementById("plannerGoalMeta").textContent = goalAmount
      ? `${(100 - progressPercent).toFixed(1)}% of the target is still left to reach.`
      : "Save a plan to see your estimated progress.";

    const adviceList = document.getElementById("plannerAdviceList");
    const adviceTemplate = document.getElementById("plannerAdviceTemplate");
    const adviceItems = [
      {
        title: "Monthly savings target",
        value: formatCurrency(state.planner.savingsTarget || 0),
        note: spendCap > 0 ? `Keep monthly spending near ${formatCurrency(spendCap)} to preserve your target.` : "Set income and savings targets to receive a spending cap.",
      },
      {
        title: "Emergency cushion",
        value: formatCurrency(state.planner.emergencyTarget || 0),
        note: avgSavings > 0 && state.planner.emergencyTarget
          ? `At your recent pace, this cushion may take about ${Math.ceil(state.planner.emergencyTarget / avgSavings)} months.`
          : "Build a stronger monthly surplus to estimate your emergency timeline.",
      },
      {
        title: "Current net position",
        value: formatCurrency(netBalance),
        note: netBalance >= 0 ? "Your overall income still stays ahead of expense totals." : "Expenses currently exceed income in your saved records.",
      },
    ].map((item) => {
      const fragment = adviceTemplate.content.cloneNode(true);
      fragment.querySelector(".insight-category").textContent = item.title;
      fragment.querySelector(".insight-value").textContent = item.value;
      fragment.querySelector(".planner-note").textContent = item.note;
      return fragment;
    });
    setInsightCollection(adviceList, adviceItems, "No advice available yet.");

    const trendTable = document.getElementById("plannerTrendTable");
    trendTable.innerHTML = `<div class="table-head"><span>Month</span><span>Income</span><span>Expenses</span><span>Net</span></div>`;
    getMonthlyBuckets(3).forEach((bucket) => {
      trendTable.innerHTML += `<div class="table-row"><span>${getMonthLabel(bucket.key)}</span><span>${formatCurrency(bucket.income)}</span><span>${formatCurrency(bucket.expenses)}</span><span>${formatCurrency(bucket.net)}</span></div>`;
    });
  }

  plannerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    state.planner = {
      incomeTarget: Number(fields.incomeTarget.value) || 0,
      savingsTarget: Number(fields.savingsTarget.value) || 0,
      emergencyTarget: Number(fields.emergencyTarget.value) || 0,
      goalName: fields.goalName.value.trim(),
      goalAmount: Number(fields.goalAmount.value) || 0,
      goalMonth: fields.goalMonth.value,
    };
    savePlanner();
    renderPlanner();
  });

  syncForm();
  renderPlanner();
}

function initializeSettings() {
  const exportDataBtn = document.getElementById("exportDataBtn");
  if (!exportDataBtn) {
    return;
  }

  const importDataInput = document.getElementById("importDataInput");
  const resetDataBtn = document.getElementById("resetDataBtn");
  const settingsMessage = document.getElementById("settingsMessage");

  function renderSummary() {
    document.getElementById("settingsTransactionCount").textContent = String(state.transactions.length);
    document.getElementById("settingsBudget").textContent = formatCurrency(state.budget);
    document.getElementById("settingsGoal").textContent = state.planner.goalName || "Not set";
  }

  exportDataBtn.addEventListener("click", () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      transactions: state.transactions,
      budget: state.budget,
      planner: state.planner,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ledgerleaf-backup.json";
    link.click();
    URL.revokeObjectURL(url);
    settingsMessage.textContent = "Backup exported successfully.";
  });

  importDataInput.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      state.transactions = Array.isArray(data.transactions) ? data.transactions : [];
      state.budget = Number(data.budget || 0);
      state.planner = { ...plannerDefaults, ...(data.planner || {}) };
      saveTransactions();
      saveBudget();
      savePlanner();
      renderSummary();
      settingsMessage.textContent = "Data imported successfully.";
    } catch {
      settingsMessage.textContent = "Import failed. Please use a valid LedgerLeaf JSON backup.";
    }
    event.target.value = "";
  });

  resetDataBtn.addEventListener("click", () => {
    if (!window.confirm("Reset all saved expense, budget, and planner data?")) {
      return;
    }
    localStorage.removeItem(storageKeys.transactions);
    localStorage.removeItem(storageKeys.budget);
    localStorage.removeItem(storageKeys.planner);
    state.transactions = [];
    state.budget = 0;
    state.planner = { ...plannerDefaults };
    settingsMessage.textContent = "All local data has been reset.";
    renderSummary();
  });

  renderSummary();
}

function init() {
  loadState();
  seedDemoData();
  initializeDashboard();
  initializeReports();
  initializePlanner();
  initializeSettings();
}

init();
