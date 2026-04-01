const categoriesByType = {
  expense: ["Food", "Transport", "Housing", "Utilities", "Health", "Shopping", "Entertainment", "Education", "Travel", "Other"],
  income: ["Salary", "Freelance", "Business", "Investment", "Gift", "Refund", "Other"],
};

const storageKeys = {
  transactions: "ledgerleaf-transactions",
  budget: "ledgerleaf-budget",
};

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
});

const state = {
  transactions: [],
  budget: 0,
  editingId: null,
  filters: {
    search: "",
    type: "all",
    category: "all",
    month: "",
  },
};

const elements = {
  transactionForm: document.getElementById("transactionForm"),
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
};

function loadState() {
  try {
    const storedTransactions = JSON.parse(localStorage.getItem(storageKeys.transactions) || "[]");
    const storedBudget = Number(localStorage.getItem(storageKeys.budget) || 0);
    state.transactions = Array.isArray(storedTransactions) ? storedTransactions : [];
    state.budget = Number.isFinite(storedBudget) ? storedBudget : 0;
  } catch {
    state.transactions = [];
    state.budget = 0;
  }
}

function saveTransactions() {
  localStorage.setItem(storageKeys.transactions, JSON.stringify(state.transactions));
}

function saveBudget() {
  localStorage.setItem(storageKeys.budget, String(state.budget));
}

function formatCurrency(value) {
  return currencyFormatter.format(value || 0);
}

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function setDefaultDate() {
  const today = getTodayString();
  elements.date.value = today;
  elements.filterMonth.value = today.slice(0, 7);
  state.filters.month = today.slice(0, 7);
}

function updateCategoryOptions(selectedType, selectedCategory = "") {
  const categories = categoriesByType[selectedType];
  elements.category.innerHTML = categories
    .map((category) => `<option value="${category}">${category}</option>`)
    .join("");

  if (selectedCategory && categories.includes(selectedCategory)) {
    elements.category.value = selectedCategory;
  }
}

function updateFilterCategoryOptions() {
  const uniqueCategories = [...new Set(
    state.transactions.map((transaction) => transaction.category).filter(Boolean)
  )].sort((a, b) => a.localeCompare(b));

  const current = state.filters.category;
  elements.filterCategory.innerHTML = [
    `<option value="all">All categories</option>`,
    ...uniqueCategories.map((category) => `<option value="${category}">${category}</option>`),
  ].join("");

  elements.filterCategory.value = uniqueCategories.includes(current) ? current : "all";
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

function computeTotals(transactions) {
  return transactions.reduce(
    (totals, transaction) => {
      if (transaction.type === "income") {
        totals.income += transaction.amount;
      } else {
        totals.expenses += transaction.amount;
      }
      return totals;
    },
    { income: 0, expenses: 0 }
  );
}

function renderStats() {
  const overallTotals = computeTotals(state.transactions);
  const filteredTransactions = getFilteredTransactions();
  const monthKey = elements.filterMonth.value || getTodayString().slice(0, 7);
  const monthTransactions = state.transactions.filter((transaction) => transaction.date.startsWith(monthKey));
  const monthTotals = computeTotals(monthTransactions);
  const balance = overallTotals.income - overallTotals.expenses;

  elements.totalIncome.textContent = formatCurrency(overallTotals.income);
  elements.totalExpenses.textContent = formatCurrency(overallTotals.expenses);
  elements.totalBalance.textContent = formatCurrency(balance);
  elements.transactionCount.textContent = String(filteredTransactions.length);

  elements.heroNet.textContent = formatCurrency(monthTotals.income - monthTotals.expenses);
  elements.heroIncome.textContent = formatCurrency(monthTotals.income);
  elements.heroExpense.textContent = formatCurrency(monthTotals.expenses);

  renderBudget(monthTotals.expenses);
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
  const isOverBudget = remaining < 0;

  elements.budgetBar.style.width = `${percent}%`;
  elements.budgetStatus.textContent = isOverBudget ? "Budget exceeded" : "Budget on track";
  elements.budgetMeta.textContent = isOverBudget
    ? `${formatCurrency(Math.abs(remaining))} over your monthly budget.`
    : `${formatCurrency(remaining)} left in your monthly budget.`;
}

function renderTransactions() {
  const filteredTransactions = getFilteredTransactions();
  elements.transactionList.innerHTML = "";

  if (!filteredTransactions.length) {
    elements.transactionList.innerHTML = `<p class="empty-state">No transactions match the current filters yet.</p>`;
    return;
  }

  filteredTransactions.forEach((transaction) => {
    const fragment = elements.transactionItemTemplate.content.cloneNode(true);
    const item = fragment.querySelector(".transaction-item");
    const title = fragment.querySelector(".transaction-title");
    const amount = fragment.querySelector(".transaction-amount");
    const meta = fragment.querySelector(".transaction-meta");
    const notes = fragment.querySelector(".transaction-notes");
    const editBtn = fragment.querySelector(".edit-btn");
    const deleteBtn = fragment.querySelector(".delete-btn");

    title.textContent = transaction.title;
    amount.textContent = `${transaction.type === "income" ? "+" : "-"}${formatCurrency(transaction.amount)}`;
    amount.classList.add(transaction.type);
    meta.textContent = `${transaction.category} • ${transaction.paymentMethod} • ${formatDisplayDate(transaction.date)}`;
    notes.textContent = transaction.notes || "";

    editBtn.addEventListener("click", () => startEditing(transaction.id));
    deleteBtn.addEventListener("click", () => deleteTransaction(transaction.id));

    item.dataset.id = transaction.id;
    elements.transactionList.appendChild(fragment);
  });
}

function renderInsights() {
  const monthKey = elements.filterMonth.value || getTodayString().slice(0, 7);
  const expenseTransactions = state.transactions.filter(
    (transaction) => transaction.type === "expense" && transaction.date.startsWith(monthKey)
  );

  elements.insightsList.innerHTML = "";

  if (!expenseTransactions.length) {
    elements.insightsList.innerHTML = `<p class="empty-state">Add expenses for this month to see category breakdowns here.</p>`;
    return;
  }

  const totalsByCategory = expenseTransactions.reduce((accumulator, transaction) => {
    accumulator[transaction.category] = (accumulator[transaction.category] || 0) + transaction.amount;
    return accumulator;
  }, {});

  const highestValue = Math.max(...Object.values(totalsByCategory));

  Object.entries(totalsByCategory)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, total]) => {
      const fragment = elements.insightItemTemplate.content.cloneNode(true);
      fragment.querySelector(".insight-category").textContent = category;
      fragment.querySelector(".insight-value").textContent = formatCurrency(total);
      fragment.querySelector(".insight-bar").style.width = `${(total / highestValue) * 100}%`;
      elements.insightsList.appendChild(fragment);
    });
}

function formatDisplayDate(value) {
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function resetForm() {
  state.editingId = null;
  elements.transactionForm.reset();
  elements.formTitle.textContent = "Add a new entry";
  elements.submitBtn.textContent = "Save transaction";
  elements.cancelEditBtn.classList.add("hidden");
  elements.type.value = "expense";
  updateCategoryOptions("expense");
  elements.paymentMethod.value = "UPI";
  elements.notes.value = "";
  elements.date.value = getTodayString();
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
  if (!transaction) {
    return;
  }

  const shouldDelete = window.confirm(`Delete "${transaction.title}"?`);
  if (!shouldDelete) {
    return;
  }

  state.transactions = state.transactions.filter((item) => item.id !== transactionId);
  if (state.editingId === transactionId) {
    resetForm();
  }

  saveTransactions();
  refreshUI();
}

function handleTransactionSubmit(event) {
  event.preventDefault();

  const formData = new FormData(elements.transactionForm);
  const transaction = {
    id: state.editingId || crypto.randomUUID(),
    title: formData.get("title").trim(),
    amount: Number(formData.get("amount")),
    type: formData.get("type"),
    category: formData.get("category"),
    date: formData.get("date"),
    paymentMethod: formData.get("paymentMethod"),
    notes: formData.get("notes").trim(),
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
  refreshUI();
}

function handleBudgetSubmit(event) {
  event.preventDefault();
  state.budget = Math.max(0, Number(elements.budgetInput.value) || 0);
  saveBudget();
  refreshUI();
}

function bindEvents() {
  elements.type.addEventListener("change", (event) => {
    updateCategoryOptions(event.target.value);
  });

  elements.transactionForm.addEventListener("submit", handleTransactionSubmit);
  elements.budgetForm.addEventListener("submit", handleBudgetSubmit);
  elements.cancelEditBtn.addEventListener("click", resetForm);

  elements.searchInput.addEventListener("input", (event) => {
    state.filters.search = event.target.value;
    renderTransactions();
    renderStats();
  });

  elements.filterType.addEventListener("change", (event) => {
    state.filters.type = event.target.value;
    renderTransactions();
    renderStats();
  });

  elements.filterCategory.addEventListener("change", (event) => {
    state.filters.category = event.target.value;
    renderTransactions();
    renderStats();
  });

  elements.filterMonth.addEventListener("change", (event) => {
    state.filters.month = event.target.value;
    renderTransactions();
    renderStats();
    renderInsights();
  });
}

function refreshUI() {
  updateFilterCategoryOptions();
  renderStats();
  renderTransactions();
  renderInsights();
}

function seedDemoData() {
  if (state.transactions.length) {
    return;
  }

  const currentMonth = getTodayString().slice(0, 7);
  state.transactions = [
    {
      id: crypto.randomUUID(),
      title: "Monthly salary",
      amount: 72000,
      type: "income",
      category: "Salary",
      date: `${currentMonth}-01`,
      paymentMethod: "Bank Transfer",
      notes: "Primary salary credit",
    },
    {
      id: crypto.randomUUID(),
      title: "Groceries",
      amount: 3850,
      type: "expense",
      category: "Food",
      date: `${currentMonth}-05`,
      paymentMethod: "UPI",
      notes: "Weekly household shopping",
    },
    {
      id: crypto.randomUUID(),
      title: "Internet bill",
      amount: 999,
      type: "expense",
      category: "Utilities",
      date: `${currentMonth}-08`,
      paymentMethod: "Card",
      notes: "Home broadband",
    },
    {
      id: crypto.randomUUID(),
      title: "Metro recharge",
      amount: 1200,
      type: "expense",
      category: "Transport",
      date: `${currentMonth}-10`,
      paymentMethod: "Wallet",
      notes: "Monthly commute top-up",
    },
  ];
  state.budget = 25000;
  saveTransactions();
  saveBudget();
}

function init() {
  loadState();
  seedDemoData();
  setDefaultDate();
  updateCategoryOptions("expense");
  bindEvents();
  refreshUI();
}

init();
