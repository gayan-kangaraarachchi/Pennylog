// English (United Kingdom): the default language. Every key must exist here.
window.PENNYLOG_LOCALES = window.PENNYLOG_LOCALES || {};
window.PENNYLOG_LOCALES["en-GB"] = {
  // app frame
  tabMonth: "Month", tabSpend: "Spending", tabBudget: "Budget", tabGoals: "Goals",
  sections: "Sections", language: "Language", settingsExport: "Settings and export",
  add: "Add", addTxAria: "Add a transaction",
  loading: "Loading…", syncCloud: "Private · synced", syncLocal: "On this device",
  loadingBudget: "Loading your budget…", loadingTx: "Loading transactions…",

  // common words
  close: "Close", edit: "Edit", save: "Save", saveChanges: "Save changes", name: "Name", date: "Date", note: "Note",
  amount: "Amount", category: "Category", currency: "Currency", type: "Type", filter: "Filter",
  income: "Income", spending: "Spending", spent: "Spent", in: "In", out: "Out", all: "All",
  today: "Today", yesterday: "Yesterday", month: "Month", more: "+ more", latest: "Latest",
  over: "Over", close_: "Close", remaining: "Remaining", budgeted: "Budgeted", paid: "Paid", overdue: "Overdue",
  billTag: "Bill", goalTag: "Goal", uncategorised: "Uncategorised", thisCat: "This category",
  tapConfirm: "Tap again to confirm",
  transactions: "Transactions",

  // suggested categories
  cat_housing: "Housing", cat_groceries: "Groceries", cat_transport: "Transport", cat_utilities: "Utilities",
  cat_eating: "Eating out", cat_health: "Health", cat_shopping: "Shopping", cat_fun: "Fun",
  cat_subs: "Subscriptions", cat_savings: "Savings", cat_other: "Other",
  cat_salary: "Salary", cat_side: "Side income", cat_otherinc: "Other income",

  // errors
  errFull: "Storage is full. Export a backup, then delete old transactions.",
  errViewOnly: "You can view this budget but not change it.",
  errSave: "Couldn't save. Check your connection and try again.",

  // month navigation
  prevMonth: "Previous month", nextMonth: "Next month", backToNow: "Back to this month",

  // first run
  setupTitle: "Set up your monthly budget",
  setupHelp: "Give each spending category a monthly limit, then log what you spend. Pennylog shows what's left, which categories are close to their limit, and whether you're spending faster than the month is passing.",
  useSuggested: "Start with suggested budgets", setOwn: "Set my own budgets",
  suggestedAdded: "Suggested budgets added. Adjust them any time under Budget",

  // Month tab
  overBudget: "Over budget", aheadOfPace: "Spending ahead of pace", onTrack: "On track",
  leftFromIncome: "Left from income", leftInBudget: "Left in budget",
  inOut: "{i} in · {o} out", moreExpected: "{a} more income expected", spentOf: "{s} spent of {b} budgeted",
  savingsRate: "Savings rate", budgetPace: "Budget pace",
  paceText: p => `${p.u}% of your budget is used${p.m !== null && p.m !== undefined ? ` and ${p.m}% of the month has passed` : ""}.`,
  leftToSpend: p => `${p.a} left to spend${p.d ? `, about ${p.d} a day` : ""}.`,
  overTotal: "{a} over the total.",
  chartAria: "Spending so far this month compared with an even budget pace",
  spentSoFar: "Spent so far", evenPace: "Even pace to {a}",
  billsThisMonth: "Bills this month", nPaid: "{p}/{n} paid",
  whereItWent: "Where it went", allCategories: "All categories",
  overBy: "{a} over", budgetOf: "{b} budget", leftOf: "{a} left of {b}", left: "{a} left",
  shareNoBudget: "{p}% of spending · no budget set",
  nothingSpent: "Nothing spent in {m} yet. Tap <b>Add</b> to log your first purchase.",
  seeAll: "See all {n}",

  // Spending tab
  searchPh: "Search notes and categories", searchAria: "Search transactions",
  noMatch: "No transactions match.", noTx: "No transactions in {m}. Tap <b>Add</b> to log one.",

  // Budget tab
  spendingCats: "Spending categories", editBudgets: "Edit budgets", noBudgetSet: "No budget set for this category",
  hiddenCats: p => p.n === 1 ? "1 category has no budget and no spending this month." : `${p.n} categories have no budget and no spending this month.`,
  receivedExpected: "Received · expected",
  incomeHelp: "Set your expected monthly salary under <b>Edit budgets</b> so Pennylog can show what's left from income.",
  recurringBills: "Recurring bills", perMonth: "{a} a month", addBill: "+ Bill",
  billsHelp: "Add rent, phone, streaming and other fixed costs. Mark each paid with one tap and it's logged as spending.",
  markPaid: "Mark paid",

  // Goals tab
  goalsTitle: "Savings goals", goalsSub: "Put money aside for the things that matter.", savedOf: "{s} saved of {t}",
  addGoal: "+ Goal", goalsEmptyTitle: "What are you saving for?",
  goalsEmptyHelp: "An emergency fund, a trip, a new laptop. Set a target and a date, and Pennylog works out how much to put aside each month.",
  createGoal: "Create goal", goalReached: "Goal reached", perMonthBy: "{a} a month to reach it by {d}",
  datePassed: "Target date passed", toGo: "{a} to go", ofAmount: "of {a}", addMoney: "Add money",

  // transaction sheet
  addTx: "Add transaction", editTx: "Edit transaction", deleteTx: "Delete transaction",
  noteIncPh: "e.g. November salary", noteExpPh: "e.g. Lidl, bus ticket",
  txDeleted: "Transaction deleted", needAmount: "Enter an amount",
  spendingSaved: "Spending of {a} saved", incomeSaved: "Income of {a} saved", catOver: "{c} is {a} over budget",

  // budgets sheet
  monthlyBudgets: "Monthly budgets",
  budgetsHelp: "Budgets repeat every month. Leave a budget at 0 to track a category without a limit. Tap a colour to change it.",
  spendingLimit: "Spending · monthly limit", incomeExpected: "Income · expected each month",
  changeColor: "Change colour of {c}", catName: "Category name", catAmount: "{c} amount", removeCat: "Remove {c}",
  addExpCat: "+ Spending category", addIncCat: "+ Income category", totalBudget: "Total monthly budget",
  saveBudgets: "Save budgets", budgetsSaved: "Budgets saved",
  catInUse: "{c} has transactions. Rename it instead, or set its budget to 0.",
  keepOneEach: "Keep at least one spending and one income category",

  // bill sheet
  editBill: "Edit bill", newBill: "New recurring bill", billNamePh: "e.g. Rent, phone, Netflix",
  amountIn: "Amount ({s})", dueDay: "Due day of month", saveBill: "Save bill", addBillBtn: "Add bill",
  removeBill: "Remove bill", billRemoved: "Bill removed", needBillAmount: "Enter the bill amount",
  billSaved: "Bill saved", billAdded: "{n} added. It shows on the Month tab every month",
  billPaidToast: "{n} marked paid · {a} logged",

  // goal sheets
  editGoal: "Edit goal", newGoal: "New savings goal", goalNamePh: "e.g. Emergency fund, Lapland trip",
  targetIn: "Target ({s})", savedSoFar: "Saved so far", reachBy: "Reach it by (optional)",
  saveGoal: "Save goal", deleteGoal: "Delete goal", goalDeleted: "Goal deleted", needTarget: "Enter a target amount",
  goalSaved: "Goal saved", goalCreated: "{n} created",
  addTo: "Add to {n}", direction: "Direction", putIn: "Put in", takeOut: "Take out",
  logAsSpending: "Also log it as spending under {c}, so it comes out of this month's money",
  toGoal: "To {n}", goalReachedToast: "{n} reached. Well done!", addedTo: "Added {a} to {n}", tookFrom: "Took {a} from {n}",

  // settings
  settings: "Settings", currencySet: "Currency set to {c}",
  export: "Export", exportHelp: "A spreadsheet of your transactions, for Excel or Google Sheets.",
  monthCsv: "{m} as CSV", allCsv: "All transactions as CSV", nothingToExport: "No transactions to export",
  csvDate: "Date", csvType: "Type",
  backup: "Backup", backupHelp: "Save everything (budgets, bills, goals, transactions) to one file, or load a backup. Loading adds transactions you don't already have.",
  saveBackup: "Save backup", loadBackup: "Load backup",
  storedCloud: "Your budget is saved to your account and private to you. Other people who open this page see only their own budget.",
  storedLocal: "Saved in this browser only. Save a backup now and then.",
  fileSaved: "File saved", fileFailed: "Couldn't save the file here. Try again in a moment.", downloadBlocked: "This browser blocked the download.",
  notBackup: "That file isn't a Pennylog backup.", loadingBackup: "Loading backup…",
  backupLoaded: p => `Backup loaded · ${p.n} transaction${p.n === 1 ? "" : "s"} added`
};
