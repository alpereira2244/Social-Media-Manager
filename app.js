const STORAGE_KEY = "alberto-ops-dashboard-v1";
const CHECKLIST_KEY = "alberto-ops-checklist-v1";
const WEEKLY_TASKS_KEY = "alberto-ops-weekly-tasks-v1";
const WAITING_KEY = "alberto-ops-waiting-v1";
const NOTES_KEY = "alberto-ops-notes-v1";
const ACCESS_KEY = "alberto-ops-access-v1";
const LAST_OPENED_KEY = "alberto-ops-last-opened-v1";
const LAST_MONTH_KEY = "alberto-ops-last-month-v1";
const LAST_WEEK_KEY = "alberto-ops-last-week-v1";

const today = new Date();
const isoToday = toIsoDate(today);
const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
const currentWeekKey = getWeekKey(today);

const seedTasks = [
  {
    title: "Post content",
    lane: "Content",
    priority: "1",
    due: isoToday,
    repeat: "daily",
    status: "active",
    notes: "Daily non-negotiable. Pull from the content bank when possible.",
    subtasks: createSocialChecklist()
  },
  {
    title: "Create a 10-post content backlog",
    lane: "Content",
    priority: "2",
    due: addDaysIso(2),
    repeat: "none",
    status: "active",
    notes: "Ideas, screenshots, founder notes, launches, lessons learned, customer stories.",
    subtasks: createSocialChecklist()
  },
  {
    title: "Make sure all bills are paid",
    lane: "Bills",
    priority: "1",
    due: isoToday,
    repeat: "weekly",
    status: "active",
    notes: "Check due dates, payment method, owner, and whether autopay is enabled."
  },
  {
    title: "Weekly accounting report",
    lane: "Bills",
    priority: "2",
    due: nextWeekdayIso(5),
    repeat: "weekly",
    status: "active",
    notes: "Summarize paid, upcoming, blocked, and anything that needs approval."
  },
  {
    title: "Organize weekly team activity",
    lane: "People",
    priority: "2",
    due: nextWeekdayIso(4),
    repeat: "weekly",
    status: "active",
    notes: "Pick activity, confirm time, send invite, handle supplies."
  },
  {
    title: "Connect with Evan and Caro for onboarding merch",
    lane: "People",
    priority: "1",
    due: addDaysIso(1),
    repeat: "none",
    status: "active",
    notes: "Confirm what merch exists, what needs ordering, and who approves spend."
  },
  {
    title: "Set up the automation hotline",
    lane: "Admin",
    priority: "1",
    due: addDaysIso(3),
    repeat: "none",
    status: "waiting",
    notes: "Needs Caro support."
  },
  {
    title: "Lead ISO/SOC",
    lane: "Admin",
    priority: "1",
    due: addDaysIso(4),
    repeat: "none",
    status: "active",
    notes: "Start by listing required evidence, owners, and next milestone."
  },
  {
    title: "Conduit Metal Sign",
    lane: "Ops",
    priority: "2",
    due: addDaysIso(5),
    repeat: "none",
    status: "active",
    notes: "Get vendor, price, dimensions, approval, delivery date."
  },
  {
    title: "Get FDE's pagers",
    lane: "Ops",
    priority: "2",
    due: addDaysIso(5),
    repeat: "none",
    status: "active",
    notes: "Confirm exact quantity, carrier/process, and recipient list."
  },
  {
    title: "Put together sales materials",
    lane: "Sales",
    priority: "2",
    due: addDaysIso(6),
    repeat: "none",
    status: "active",
    notes: "Collect latest screenshots, proof points, pricing, and objections."
  },
  {
    title: "Office maintenance sweep",
    lane: "Ops",
    priority: "3",
    due: addDaysIso(2),
    repeat: "weekly",
    status: "active",
    notes: "Supplies, cleanliness, equipment, snacks, conference rooms."
  }
].map((task, index) => ({ id: createId(), createdAt: Date.now() + index, ...task }));

const seedChecklist = [
  { id: "daily-content", title: "Post or schedule content", cadence: "Daily", done: false },
  { id: "bill-check", title: "Check bill deadlines", cadence: "Daily", done: false },
  { id: "update-tracker", title: "Update tracker", cadence: "Daily", done: false },
  { id: "follow-ups", title: "Send blocker follow-ups", cadence: "Daily", done: false },
  { id: "team-activity", title: "Plan team activity", cadence: "Weekly", done: false },
  { id: "accounting-report", title: "Send accounting report", cadence: "Weekly", details: "Check Rho, QuickBooks, and Rippling", done: false },
  { id: "office-sweep", title: "Office maintenance sweep", cadence: "Weekly", done: false },
  { id: "content-bank", title: "Refresh content bank", cadence: "Weekly", done: false },
  { id: "monthly-rent", title: "Rent", company: "9th Street Funds (RHO)", cadence: "Monthly", type: "monthly-bill", done: false, paidDate: "", amountPaid: 0, stages: createBillStages() },
  { id: "monthly-water", title: "Water", company: "SF Water", cadence: "Monthly", type: "monthly-bill", done: false, paidDate: "", amountPaid: 0, stages: createBillStages() },
  { id: "monthly-electric", title: "Electric", company: "PG&E", cadence: "Monthly", type: "monthly-bill", done: false, paidDate: "", amountPaid: 0, stages: createBillStages() },
  { id: "monthly-trash", title: "Trash", company: "Recology", cadence: "Monthly", type: "monthly-bill", done: false, paidDate: "", amountPaid: 0, stages: createBillStages() },
  { id: "monthly-alarm", title: "Alarm", company: "AT&T (RHO)", cadence: "Monthly", type: "monthly-bill", done: false, paidDate: "", amountPaid: 0, stages: createBillStages() },
  { id: "monthly-housekeeping", title: "Housekeeping", company: "Frida (Zelle)", cadence: "Monthly", type: "monthly-bill", done: false, paidDate: "", amountPaid: 0, stages: createBillStages() },
  { id: "monthly-wifi", title: "Wifi", company: "WiLine", cadence: "Monthly", type: "monthly-bill", done: false, paidDate: "", amountPaid: 0, stages: createBillStages() },
  { id: "monthly-insurance", title: "Insurance", company: "CNA", cadence: "Monthly", type: "monthly-bill", done: false, paidDate: "", amountPaid: 0, stages: createBillStages() },
  { id: "monthly-accounting", title: "Accounting", company: "Aprio", cadence: "Monthly", type: "monthly-bill", done: false, paidDate: "", amountPaid: 0, stages: createBillStages() }
];

const weekdayNames = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday"
};

const seedWeeklyTasks = [
  { id: "weekly-snacks", day: 1, title: "Order snacks for the week", done: false, custom: false },
  { id: "weekly-trash", day: 2, title: "Take out trash, recycling, and compost", done: false, custom: false },
  { id: "weekly-supplies", day: 3, title: "Check office supplies and restock needs", done: false, custom: false },
  { id: "weekly-team-activity", day: 4, title: "Confirm weekly team activity logistics", done: false, custom: false },
  { id: "weekly-accounting", day: 5, title: "Prepare weekly accounting report", done: false, custom: false }
];

const seedAccessItems = [
  { id: "access-rho", name: "Rho", area: "Accounting", status: "have", username: "", password: "", url: "", notes: "" },
  { id: "access-quickbooks", name: "QuickBooks", area: "Accounting", status: "have", username: "", password: "", url: "", notes: "" },
  { id: "access-rippling", name: "Rippling", area: "People/Payroll", status: "have", username: "", password: "", url: "", notes: "" },
  { id: "access-linkedin", name: "LinkedIn company page", area: "Content", status: "need", username: "", password: "", url: "", notes: "" },
  { id: "access-canva-figma", name: "Canva / Figma", area: "Design", status: "unknown", username: "", password: "", url: "", notes: "" },
  { id: "access-drive", name: "Drive / docs folder", area: "Internal docs", status: "unknown", username: "", password: "", url: "", notes: "" },
  { id: "access-vanta", name: "Vanta / Drata / Secureframe", area: "ISO/SOC", status: "unknown", username: "", password: "", url: "", notes: "" }
];

let tasks = loadTasks();
let checklist = loadChecklist();
let weeklyTasks = loadWeeklyTasks();
let notesItems = loadNotesItems();
let accessItems = loadAccessItems();
let activeFilter = "active";
let lastFinalizeSnapshot = null;

resetDailyItemsIfNeeded();
pruneOrphanTaskUpdates();

const form = document.querySelector("#task-form");
const monthlyBillForm = document.querySelector("#monthly-bill-form");
const weeklyTaskForm = document.querySelector("#weekly-task-form");
const noteForm = document.querySelector("#note-form");
const accountForm = document.querySelector("#account-form");
const noteArchiveFilter = document.querySelector("#note-archive-filter");
const accountSearch = document.querySelector("#account-search");
const finalizeNotesButton = document.querySelector("#finalize-notes");
const undoFinalizeButton = document.querySelector("#undo-finalize");
const finalizeSummary = document.querySelector("#finalize-summary");
const template = document.querySelector("#task-template");
const filters = document.querySelectorAll(".filter");
const templateButtons = document.querySelectorAll(".template-button");
const tabButtons = document.querySelectorAll(".tab-button");
const appViews = document.querySelectorAll(".app-view");

document.querySelector("#current-date").textContent = today.toLocaleDateString(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric"
});

document.querySelector("#copy-standup").addEventListener("click", () => {
  copyText(buildStandupUpdate(), "Daily update copied.");
});

document.querySelector("#export-monthly-summary").addEventListener("click", () => {
  exportMonthlyBillSummary();
});

document.querySelector("#copy-manager-questions").addEventListener("click", () => {
  copyText(buildManagerQuestions(), "Manager questions copied.");
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const task = {
    id: createId(),
    title: formData.get("title").trim(),
    lane: formData.get("lane"),
    priority: formData.get("priority"),
    due: formData.get("due"),
    repeat: formData.get("repeat"),
    status: "active",
    notes: formData.get("notes").trim(),
    subtasks: shouldUseSocialChecklist(formData.get("lane"), formData.get("title")) ? createSocialChecklist() : [],
    createdAt: Date.now()
  };

  tasks.unshift(task);
  saveTasks();
  form.reset();
  render();
});

monthlyBillForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(monthlyBillForm);
  checklist.push({
    id: `monthly-${createId()}`,
    title: formData.get("title").trim(),
    company: formData.get("company").trim(),
    cadence: "Monthly",
    type: "monthly-bill",
    done: false,
    paidDate: "",
    amountPaid: 0,
    stages: createBillStages(),
    custom: true
  });
  saveChecklist();
  monthlyBillForm.reset();
  render();
});

weeklyTaskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(weeklyTaskForm);
  weeklyTasks.push({
    id: `weekly-${createId()}`,
    day: Number(formData.get("day")),
    title: formData.get("title").trim(),
    done: false,
    custom: true
  });
  saveWeeklyTasks();
  weeklyTaskForm.reset();
  render();
});

noteForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(noteForm);
  const note = {
    id: `note-${createId()}`,
    text: formData.get("text").trim(),
    context: formData.get("context").trim(),
    tag: "auto",
    status: "open",
    date: isoToday,
    createdAt: Date.now()
  };
  note.cleanedText = cleanMeetingNote(note.text);
  note.suggestion = {
    kind: "capture",
    title: "Captured note",
    lane: "Admin",
    priority: "3",
    due: isoToday
  };
  notesItems.unshift(note);
  saveNotesItems();
  noteForm.reset();
  render();
});

accountForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(accountForm);
  accessItems.unshift({
    id: `access-${createId()}`,
    name: formData.get("name").trim(),
    area: formData.get("area").trim(),
    status: "have",
    username: formData.get("username").trim(),
    password: formData.get("password"),
    url: formData.get("url").trim(),
    notes: formData.get("notes").trim(),
    custom: true,
    revealed: false
  });
  saveAccessItems();
  accountForm.reset();
  renderAccessChecklist();
});

noteArchiveFilter.addEventListener("change", () => {
  renderNotesInbox();
});

accountSearch.addEventListener("input", () => {
  renderAccessChecklist();
});

finalizeNotesButton.addEventListener("click", () => {
  lastFinalizeSnapshot = {
    tasks: cloneData(tasks),
    notesItems: cloneData(notesItems)
  };
  const result = finalizeOpenNotes();
  saveNotesItems();
  saveTasks();
  undoFinalizeButton.disabled = result.total === 0;
  renderFinalizeSummary(result);
  render();
});

undoFinalizeButton.addEventListener("click", () => {
  if (!lastFinalizeSnapshot) return;
  tasks = cloneData(lastFinalizeSnapshot.tasks);
  notesItems = cloneData(lastFinalizeSnapshot.notesItems);
  lastFinalizeSnapshot = null;
  undoFinalizeButton.disabled = true;
  finalizeSummary.hidden = true;
  saveTasks();
  saveNotesItems();
  render();
});

filters.forEach((button) => {
  button.addEventListener("click", () => {
    filters.forEach((filter) => filter.classList.remove("is-active"));
    button.classList.add("is-active");
    activeFilter = button.dataset.filter;
    render();
  });
});

templateButtons.forEach((button) => {
  button.addEventListener("click", () => {
    applyTaskTemplate(button.dataset.template);
  });
});

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    showTab(button.dataset.tab);
  });
});

document.querySelector("#reset-demo").addEventListener("click", () => {
  if (!confirm("Reset the dashboard to the starter Alberto task list?")) return;
  tasks = [...seedTasks].map((task) => ({ ...task, id: createId() }));
  checklist = seedChecklist.map((item) => (
    item.type === "monthly-bill"
      ? { ...item, stages: createBillStages() }
      : { ...item }
  ));
  weeklyTasks = seedWeeklyTasks.map((item) => ({ ...item }));
  notesItems = [];
  accessItems = seedAccessItems.map((item) => ({ ...item }));
  saveTasks();
  saveChecklist();
  saveWeeklyTasks();
  saveNotesItems();
  saveAccessItems();
  render();
});

document.querySelector("#export-data").addEventListener("click", async () => {
  const payload = JSON.stringify({ tasks, checklist, weeklyTasks, notesItems, accessItems, exportedAt: new Date().toISOString() }, null, 2);
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(payload);
      alert("Dashboard data copied to clipboard.");
      return;
    } catch (error) {
      downloadFile(payload, "alberto-dashboard-export.json", "application/json");
      return;
    }
  }

  downloadFile(payload, "alberto-dashboard-export.json", "application/json");
});

function downloadFile(payload, filename, type) {
  const blob = new Blob([payload], { type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function showTab(tabName) {
  tabButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tab === tabName);
  });
  appViews.forEach((view) => {
    view.classList.toggle("is-active", view.dataset.view === tabName);
  });
  if (location.hash !== `#${tabName}`) {
    history.replaceState(null, "", `#${tabName}`);
  }
}

function renderFinalizeSummary(result) {
  finalizeSummary.hidden = false;
  finalizeSummary.innerHTML = "";

  const title = document.createElement("strong");
  title.textContent = `Finalized ${result.total} note${result.total === 1 ? "" : "s"}`;

  const detail = document.createElement("p");
  detail.textContent = `${result.linked} attached · ${result.created} new tasks · ${result.saved} saved`;

  const list = document.createElement("div");
  list.className = "finalize-summary-list";
  result.actions.forEach((action) => {
    const item = document.createElement("span");
    item.textContent = action;
    list.append(item);
  });

  finalizeSummary.append(title, detail, list);
}

function render() {
  pruneOrphanTaskUpdates();
  const visible = getVisibleTasks();
  const doNext = visible
    .filter((task) => task.status === "active" && (task.priority === "1" || isDueSoon(task.due, 2)))
    .sort(sortTasks);
  const scheduled = visible
    .filter((task) => task.status === "active" && !doNext.includes(task))
    .sort(sortTasks);
  const waiting = visible
    .filter((task) => task.status === "waiting" || task.status === "done")
    .sort(sortTasks);

  renderList("#do-next", doNext);
  renderList("#scheduled", scheduled);
  renderList("#waiting", waiting);
  renderDailyPlan();
  renderAccountingWorkflow();
  renderNotesInbox();
  renderAccessChecklist();
  renderWeeklyCalendar();
  renderChecklist();
}

function renderDailyPlan() {
  renderContentPlan();
  renderBillAlerts();
  renderTodayPlan();
  renderWaitingBrief();
}

function renderContentPlan() {
  const target = document.querySelector("#content-plan");
  target.innerHTML = "";
  const contentTask = getTodayContentTask();

  if (!contentTask) {
    target.append(emptyState("No content task for today."));
    return;
  }

  const status = document.createElement("p");
  status.className = "quick-note";
  status.textContent = `${getCompletedSubtaskCount(contentTask)} of ${contentTask.subtasks.length} channels done`;
  target.append(status);

  contentTask.subtasks.forEach((subtask) => {
    const label = document.createElement("label");
    label.className = "quick-check";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = subtask.done;
    input.addEventListener("change", () => {
      subtask.done = input.checked;
      contentTask.status = contentTask.subtasks.every((item) => item.done) ? "done" : "active";
      saveTasks();
      render();
    });

    const text = document.createElement("span");
    text.textContent = subtask.title;
    label.append(input, text);
    target.append(label);
  });
}

function renderBillAlerts() {
  const target = document.querySelector("#bill-alerts");
  target.innerHTML = "";
  const monthlyBills = checklist.filter((item) => item.type === "monthly-bill");
  const paidBills = monthlyBills.filter((item) => item.done);
  const unpaidBills = monthlyBills.filter((item) => !item.done);
  const paidTotal = paidBills.reduce((total, bill) => total + (Number(bill.amountPaid) || 0), 0);

  if (!monthlyBills.length) {
    target.append(emptyState("Add monthly bills below."));
    return;
  }

  target.append(quickItem("Monthly bills", `${paidBills.length}/${monthlyBills.length} confirmed · ${formatMoney(paidTotal)} paid`));
  target.append(quickItem("Accounting systems", "Check Rho, QuickBooks, and Rippling before updating paid amounts"));
  if (unpaidBills.length) {
    target.append(quickItem("Still unpaid", unpaidBills.slice(0, 3).map((bill) => bill.title).join(", ")));
  }
}

function renderTodayPlan() {
  const target = document.querySelector("#today-plan");
  target.innerHTML = "";
  const todaysWeeklyTasks = weeklyTasks
    .filter((task) => task.day === today.getDay() && !task.done)
    .map((task) => quickWeeklyTask(task));
  const nextTasks = tasks
    .filter((task) => task.status === "active")
    .filter((task) => task.priority === "1" || task.due === isoToday || isOverdue(task.due))
    .sort(sortTasks)
    .slice(0, Math.max(0, 5 - todaysWeeklyTasks.length));

  if (!todaysWeeklyTasks.length && !nextTasks.length) {
    target.append(emptyState("Nothing urgent. Pick one scheduled task."));
    return;
  }

  todaysWeeklyTasks.forEach((taskNode) => target.append(taskNode));
  nextTasks.forEach((task) => {
    target.append(quickTask(task));
  });
}

function renderWaitingBrief() {
  const target = document.querySelector("#waiting-brief");
  target.innerHTML = "";
  const waitingTasks = tasks.filter((task) => task.status === "waiting").sort(sortTasks).slice(0, 5);
  const openNotes = notesItems
    .filter((item) => item.status === "open")
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 3);

  if (!waitingTasks.length && !openNotes.length) {
    target.append(emptyState("No notes waiting for triage."));
    return;
  }

  openNotes.forEach((item) => {
    target.append(quickItem(item.suggestion.title, `${item.suggestion.kind} · ${item.context || "Today"}`));
  });

  waitingTasks.forEach((task) => {
    target.append(quickItem(task.title, task.notes || "Follow up or unblock."));
  });
}

function renderList(selector, list) {
  const target = document.querySelector(selector);
  target.innerHTML = "";

  if (!list.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "Nothing here right now.";
    target.append(empty);
    return;
  }

  list.forEach((task) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.classList.add(`priority-${task.priority}`);
    if (task.status === "done") node.classList.add("done");

    node.querySelector(".task-title").textContent = task.title;
    node.querySelector(".task-notes").textContent = task.notes;
    renderSubtasks(node, task);
    renderTaskUpdates(node, task);
    node.querySelector(".task-toggle").checked = task.status === "done";
    node.querySelector(".task-toggle").addEventListener("change", (event) => {
      task.status = event.target.checked ? "done" : "active";
      if (task.subtasks && task.subtasks.length) {
        task.subtasks.forEach((subtask) => {
          subtask.done = event.target.checked;
        });
      }
      saveTasks();
      render();
    });

    node.querySelector(".waiting-button").textContent = task.status === "waiting" ? "Resume" : "Waiting";
    node.querySelector(".waiting-button").addEventListener("click", () => {
      task.status = task.status === "waiting" ? "active" : "waiting";
      saveTasks();
      render();
    });

    node.querySelector(".delete-button").addEventListener("click", () => {
      tasks = tasks.filter((item) => item.id !== task.id);
      saveTasks();
      render();
    });

    const meta = node.querySelector(".task-meta");
    meta.append(pill(task.lane, task.lane === "Bills" ? "bill" : ""));
    meta.append(pill(`P${task.priority}`));
    if (task.due) meta.append(pill(formatDate(task.due), "due"));
    if (task.repeat !== "none") meta.append(pill(task.repeat));
    if (task.status === "waiting") meta.append(pill("waiting"));
    if (task.status === "done") meta.append(pill("done"));

    target.append(node);
  });
}

function renderTaskUpdates(node, task) {
  if (!task.updates || !task.updates.length) return;

  const target = node.querySelector(".task-main");
  const wrap = document.createElement("div");
  wrap.className = "task-updates";

  const heading = document.createElement("p");
  heading.className = "subtask-summary";
  heading.textContent = "Meeting notes";
  wrap.append(heading);

  task.updates
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 3)
    .forEach((update) => {
      const item = document.createElement("div");
      item.className = "task-update";
      const text = document.createElement("p");
      const meta = document.createElement("small");
      text.textContent = update.text;
      meta.textContent = [update.context, formatDate(update.date)].filter(Boolean).join(" · ");
      item.append(text, meta);
      wrap.append(item);
    });

  target.append(wrap);
}

function renderSubtasks(node, task) {
  if (!task.subtasks || !task.subtasks.length) return;

  const target = node.querySelector(".subtask-list");
  const heading = document.createElement("p");
  heading.className = "subtask-summary";
  heading.textContent = `${getCompletedSubtaskCount(task)} of ${task.subtasks.length} channels posted`;

  const list = document.createElement("div");
  list.className = "subtask-items";

  task.subtasks.forEach((subtask) => {
    const label = document.createElement("label");
    label.className = "subtask-item";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = subtask.done;
    input.addEventListener("change", () => {
      subtask.done = input.checked;
      if (task.subtasks.every((item) => item.done)) task.status = "done";
      if (task.subtasks.some((item) => !item.done) && task.status === "done") task.status = "active";
      saveTasks();
      render();
    });

    const name = document.createElement("span");
    name.textContent = subtask.title;
    label.append(input, name);
    list.append(label);
  });

  target.append(heading, list);
}

function quickTask(task) {
  const label = document.createElement("label");
  label.className = "quick-check";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.addEventListener("change", () => {
    task.status = input.checked ? "done" : "active";
    if (task.subtasks && task.subtasks.length) {
      task.subtasks.forEach((subtask) => {
        subtask.done = input.checked;
      });
    }
    saveTasks();
    render();
  });

  const copy = document.createElement("span");
  const title = document.createElement("strong");
  const meta = document.createElement("small");
  title.textContent = task.title;
  meta.textContent = [task.lane, task.due ? formatDate(task.due) : "", `P${task.priority}`].filter(Boolean).join(" · ");
  copy.append(title, meta);
  label.append(input, copy);
  return label;
}

function quickWeeklyTask(task) {
  const label = document.createElement("label");
  label.className = "quick-check";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.addEventListener("change", () => {
    task.done = input.checked;
    saveWeeklyTasks();
    render();
  });

  const copy = document.createElement("span");
  const title = document.createElement("strong");
  const meta = document.createElement("small");
  title.textContent = task.title;
  meta.textContent = `${weekdayNames[task.day]} recurring`;
  copy.append(title, meta);
  label.append(input, copy);
  return label;
}

function quickItem(titleText, detailText) {
  const item = document.createElement("div");
  item.className = "quick-item";
  const title = document.createElement("strong");
  const detail = document.createElement("small");
  title.textContent = titleText;
  detail.textContent = detailText;
  item.append(title, detail);
  return item;
}

function emptyState(message) {
  const empty = document.createElement("p");
  empty.className = "empty compact";
  empty.textContent = message;
  return empty;
}

function renderAccountingWorkflow() {
  const target = document.querySelector("#accounting-steps");
  const monthlyBills = checklist.filter((item) => item.type === "monthly-bill");
  const paidCount = monthlyBills.filter((item) => item.done).length;
  target.innerHTML = "";

  [
    ["Rho", "Confirm outgoing payments and transaction amounts."],
    ["QuickBooks", "Check invoices, categories, and whether payments are reflected correctly."],
    ["Rippling", "Review payroll and people-related charges."],
    ["Monthly Bills", `Update paid date and amount for recurring bills (${paidCount}/${monthlyBills.length} confirmed).`],
    ["Export", "Export the monthly Excel summary whenever you need a report."]
  ].forEach(([titleText, detailText], index) => {
    const item = document.createElement("article");
    item.className = "accounting-step";
    const number = document.createElement("span");
    const title = document.createElement("strong");
    const detail = document.createElement("p");
    number.textContent = String(index + 1);
    title.textContent = titleText;
    detail.textContent = detailText;
    item.append(number, title, detail);
    target.append(item);
  });
}

function renderWeeklyCalendar() {
  const target = document.querySelector("#weekly-calendar");
  const currentDay = today.getDay();
  target.innerHTML = "";

  Object.entries(weekdayNames).forEach(([dayValue, dayName]) => {
    const day = Number(dayValue);
    const dayTasks = weeklyTasks.filter((item) => item.day === day);
    const completeCount = dayTasks.filter((item) => item.done).length;
    const column = document.createElement("section");
    column.className = "weekday-column";
    if (day === currentDay) column.classList.add("is-today");

    const heading = document.createElement("div");
    heading.className = "weekday-heading";
    const title = document.createElement("h3");
    const count = document.createElement("span");
    title.textContent = dayName;
    count.textContent = `${completeCount}/${dayTasks.length}`;
    heading.append(title, count);
    column.append(heading);

    if (!dayTasks.length) column.append(emptyState("No recurring tasks."));

    dayTasks.forEach((task) => {
      const row = document.createElement("label");
      row.className = "weekly-task";
      if (task.custom) row.classList.add("is-custom");

      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = task.done;
      input.addEventListener("change", () => {
        task.done = input.checked;
        saveWeeklyTasks();
        render();
      });

      const text = document.createElement("span");
      text.textContent = task.title;
      row.append(input, text);

      if (task.custom) {
        const deleteButton = document.createElement("button");
        deleteButton.className = "mini-button delete-button";
        deleteButton.type = "button";
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", (event) => {
          event.preventDefault();
          weeklyTasks = weeklyTasks.filter((item) => item.id !== task.id);
          saveWeeklyTasks();
          render();
        });
        row.append(deleteButton);
      }

      column.append(row);
    });

    target.append(column);
  });
}

function renderNotesInbox() {
  const suggestedTarget = document.querySelector("#suggested-actions");
  const savedTarget = document.querySelector("#saved-notes");
  suggestedTarget.innerHTML = "";
  savedTarget.innerHTML = "";
  const openNotes = notesItems.filter((item) => item.status === "open").sort((a, b) => b.createdAt - a.createdAt);
  const savedNotes = getFilteredArchiveNotes().sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);

  finalizeNotesButton.disabled = !openNotes.length;
  finalizeNotesButton.textContent = openNotes.length ? `Finalize ${openNotes.length} Note${openNotes.length === 1 ? "" : "s"}` : "Finalize Notes";

  if (!openNotes.length) {
    suggestedTarget.append(emptyState("No open notes. Add notes above, then finalize them together."));
  }

  openNotes.forEach((item) => {
    const row = document.createElement("article");
    row.className = "waiting-item note-item capture";

    const copy = document.createElement("div");
    const suggestion = document.createElement("strong");
    const source = document.createElement("p");
    const meta = document.createElement("small");
    suggestion.textContent = "Captured note";
    source.textContent = item.cleanedText || item.text;
    meta.textContent = ["waiting for finalize", item.context, formatDate(item.date)].filter(Boolean).join(" · ");
    copy.append(suggestion, source, meta);

    const deleteButton = document.createElement("button");
    deleteButton.className = "mini-button delete-button";
    deleteButton.type = "button";
    deleteButton.textContent = "Remove";
    deleteButton.addEventListener("click", () => {
      deleteNoteEverywhere(item);
      render();
    });

    row.append(copy, deleteButton);
    suggestedTarget.append(row);
  });

  if (!savedNotes.length) {
    savedTarget.append(emptyState("No notes in this archive view."));
    return;
  }

  savedNotes.forEach((item) => {
    const row = document.createElement("article");
    row.className = "saved-note";

    const title = document.createElement("strong");
    const text = document.createElement("p");
    const meta = document.createElement("small");
    title.textContent = item.suggestion.title;
    text.textContent = item.cleanedText || item.text;
    meta.textContent = [item.status, item.context, formatDate(item.date)].filter(Boolean).join(" · ");

    const actions = document.createElement("div");
    actions.className = "saved-note-actions";

    if (item.status !== "archived") {
      const archiveButton = document.createElement("button");
      archiveButton.className = "mini-button";
      archiveButton.type = "button";
      archiveButton.textContent = "Archive";
      archiveButton.addEventListener("click", () => {
        item.status = "archived";
        saveNotesItems();
        renderNotesInbox();
      });
      actions.append(archiveButton);
    }

    const restoreButton = document.createElement("button");
    restoreButton.className = "mini-button";
    restoreButton.type = "button";
    restoreButton.textContent = item.status === "open" ? "Keep Open" : "Restore";
    restoreButton.addEventListener("click", () => {
      item.status = "open";
      saveNotesItems();
      render();
    });

    const removeButton = document.createElement("button");
    removeButton.className = "mini-button delete-button";
    removeButton.type = "button";
    removeButton.textContent = "Delete";
    removeButton.addEventListener("click", () => {
      if (!confirm("Permanently delete this note?")) return;
      deleteNoteEverywhere(item);
      render();
    });

    actions.append(restoreButton, removeButton);
    row.append(title, text, meta, actions);
    savedTarget.append(row);
  });
}

function getFilteredArchiveNotes() {
  const filter = noteArchiveFilter ? noteArchiveFilter.value : "active";
  return notesItems.filter((item) => {
    if (item.status === "open") return false;
    if (filter === "all") return true;
    if (filter === "archived") return item.status === "archived";
    if (filter === "dismissed") return item.status === "dismissed";
    return item.status === "converted" || item.status === "linked" || item.status === "reference" || item.status === "saved";
  });
}

function deleteNoteEverywhere(note) {
  if (note.linkedTaskId) {
    const task = tasks.find((item) => item.id === note.linkedTaskId);
    if (task && task.updates) {
      task.updates = task.updates.filter((update) => update.noteId !== note.id);
    }
  }
  notesItems = notesItems.filter((item) => item.id !== note.id);
  saveTasks();
  saveNotesItems();
}

function pruneOrphanTaskUpdates() {
  const noteIds = new Set(notesItems.map((note) => note.id));
  let changed = false;

  tasks.forEach((task) => {
    if (!task.updates || !task.updates.length) return;
    const nextUpdates = task.updates.filter((update) => !update.noteId || noteIds.has(update.noteId));
    if (nextUpdates.length !== task.updates.length) {
      task.updates = nextUpdates;
      changed = true;
    }
  });

  if (changed) saveTasks();
}

function renderAccessChecklist() {
  const target = document.querySelector("#access-list");
  target.innerHTML = "";
  const query = accountSearch.value.trim().toLowerCase();
  const visibleItems = accessItems.filter((item) => {
    const haystack = [item.name, item.area, item.username, item.url, item.notes, item.status].join(" ").toLowerCase();
    return !query || haystack.includes(query);
  });

  if (!visibleItems.length) {
    target.append(emptyState("No accounts match that search."));
    return;
  }

  visibleItems.forEach((item) => {
    const row = document.createElement("article");
    row.className = `access-item ${item.status}`;
    if (item.expanded) row.classList.add("is-expanded");

    const header = document.createElement("div");
    header.className = "access-item-header";

    const copy = document.createElement("div");
    const name = document.createElement("strong");
    const area = document.createElement("span");
    name.textContent = item.name;
    area.textContent = item.area;
    copy.append(name, area);

    const summary = document.createElement("div");
    summary.className = "access-summary";
    const userSummary = document.createElement("span");
    const statusSummary = document.createElement("span");
    userSummary.textContent = item.username || "No username saved";
    statusSummary.textContent = item.status === "have" ? "Have access" : item.status === "need" ? "Need invite" : "Unknown";
    summary.append(userSummary, statusSummary);

    const quickActions = document.createElement("div");
    quickActions.className = "access-row-actions";

    const toggleButton = document.createElement("button");
    toggleButton.className = "mini-button";
    toggleButton.type = "button";
    toggleButton.textContent = item.expanded ? "Close" : "Open";
    toggleButton.addEventListener("click", () => {
      accessItems.forEach((accessItem) => {
        if (accessItem.id !== item.id) accessItem.expanded = false;
      });
      item.expanded = !item.expanded;
      saveAccessItems();
      renderAccessChecklist();
    });

    const copyPassQuickButton = document.createElement("button");
    copyPassQuickButton.className = "mini-button";
    copyPassQuickButton.type = "button";
    copyPassQuickButton.textContent = "Copy Pass";
    copyPassQuickButton.disabled = !item.password;
    copyPassQuickButton.addEventListener("click", () => {
      copyText(item.password || "", "Password copied.");
    });

    const removeQuickButton = document.createElement("button");
    removeQuickButton.className = "mini-button delete-button";
    removeQuickButton.type = "button";
    removeQuickButton.textContent = "Remove";
    removeQuickButton.addEventListener("click", () => {
      if (!confirm(`Remove ${item.name} from accounts?`)) return;
      accessItems = accessItems.filter((accessItem) => accessItem.id !== item.id);
      saveAccessItems();
      renderAccessChecklist();
    });

    quickActions.append(toggleButton, copyPassQuickButton, removeQuickButton);
    header.append(copy, summary, quickActions);
    row.append(header);

    if (!item.expanded) {
      target.append(row);
      return;
    }

    const details = document.createElement("div");
    details.className = "access-details";

    const select = document.createElement("select");
    ["have", "need", "unknown"].forEach((status) => {
      const option = document.createElement("option");
      option.value = status;
      option.textContent = status === "have" ? "Have access" : status === "need" ? "Need invite" : "Unknown";
      select.append(option);
    });
    select.value = item.status;
    select.addEventListener("change", () => {
      item.status = select.value;
      saveAccessItems();
      renderAccessChecklist();
    });

    const credentials = document.createElement("div");
    credentials.className = "credential-grid";

    const username = createCredentialField("Username", item.username || "", `${item.name} username`, (value) => {
      item.username = value.trim();
      saveAccessItems();
    });

    const password = createCredentialField("Password", item.password || "", `${item.name} password`, (value) => {
      item.password = value;
      saveAccessItems();
    }, item.revealed ? "text" : "password");

    const url = createCredentialField("Login link", item.url || "", `${item.name} login link`, (value) => {
      item.url = value.trim();
      saveAccessItems();
      renderAccessChecklist();
    }, "url");

    const notes = createCredentialField("Notes", item.notes || "", `${item.name} notes`, (value) => {
      item.notes = value.trim();
      saveAccessItems();
    });

    credentials.append(username, password, url, notes);

    const actions = document.createElement("div");
    actions.className = "credential-actions";

    if (item.url) {
      const link = document.createElement("a");
      link.className = "mini-button credential-link";
      link.href = item.url;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = "Open";
      actions.append(link);
    }

    const revealButton = document.createElement("button");
    revealButton.className = "mini-button";
    revealButton.type = "button";
    revealButton.textContent = item.revealed ? "Hide" : "Show";
    revealButton.addEventListener("click", () => {
      item.revealed = !item.revealed;
      renderAccessChecklist();
    });

    const copyUserButton = document.createElement("button");
    copyUserButton.className = "mini-button";
    copyUserButton.type = "button";
    copyUserButton.textContent = "Copy User";
    copyUserButton.disabled = !item.username;
    copyUserButton.addEventListener("click", () => {
      copyText(item.username || "", "Username copied.");
    });

    const copyPassButton = document.createElement("button");
    copyPassButton.className = "mini-button";
    copyPassButton.type = "button";
    copyPassButton.textContent = "Copy Pass";
    copyPassButton.disabled = !item.password;
    copyPassButton.addEventListener("click", () => {
      copyText(item.password || "", "Password copied.");
    });

    actions.append(revealButton, copyUserButton, copyPassButton);
    details.append(select, credentials, actions);
    row.append(details);
    target.append(row);
  });
}

function createCredentialField(labelText, value, ariaLabel, onChange, type = "text") {
  const label = document.createElement("label");
  label.className = "credential-field";
  label.textContent = labelText;

  const input = document.createElement("input");
  input.type = type;
  input.value = value;
  input.placeholder = labelText;
  input.setAttribute("aria-label", ariaLabel);
  input.addEventListener("change", () => onChange(input.value));

  label.append(input);
  return label;
}

function renderBillStages(item) {
  const stageLabels = [
    ["rho", "Rho"],
    ["quickbooks", "QuickBooks"],
    ["rippling", "Rippling"]
  ];
  const group = document.createElement("div");
  group.className = "bill-stage-list";

  stageLabels.forEach(([key, labelText]) => {
    const label = document.createElement("label");
    label.className = "bill-stage";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = Boolean(item.stages && item.stages[key]);
    input.addEventListener("change", () => {
      item.stages = { ...createBillStages(), ...(item.stages || {}), [key]: input.checked };
      saveChecklist();
      renderBillAlerts();
    });

    const text = document.createElement("span");
    text.textContent = labelText;
    label.append(input, text);
    group.append(label);
  });

  return group;
}

function formatBillStages(stages = createBillStages()) {
  const merged = { ...createBillStages(), ...stages };
  return [
    merged.rho ? "Rho" : "",
    merged.quickbooks ? "QB" : "",
    merged.rippling ? "Rippling" : ""
  ].filter(Boolean).join(" / ") || "No close checks";
}

function renderChecklist() {
  const target = document.querySelector("#checklist");
  const monthlyTarget = document.querySelector("#monthly-bills");
  const monthlyCount = document.querySelector("#monthly-bill-count");
  const monthlyTotal = document.querySelector("#monthly-bill-total");
  const paidLedgerList = document.querySelector("#paid-ledger-list");
  const paidLedgerTotal = document.querySelector("#paid-ledger-total");
  target.innerHTML = "";
  monthlyTarget.innerHTML = "";
  paidLedgerList.innerHTML = "";

  checklist.filter((item) => item.type !== "monthly-bill" && item.cadence !== "Weekly").forEach((item) => {
    const label = document.createElement("label");
    label.className = "checklist-item";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = item.done;
    input.addEventListener("change", () => {
      item.done = input.checked;
      saveChecklist();
    });

    const copy = document.createElement("span");
    const title = document.createElement("strong");
    const cadence = document.createElement("span");
    title.textContent = item.title;
    cadence.textContent = item.details ? `${item.cadence} · ${item.details}` : item.cadence;
    copy.append(title, cadence);
    label.append(input, copy);
    target.append(label);
  });

  const monthlyBills = checklist.filter((item) => item.type === "monthly-bill");
  const paidCount = monthlyBills.filter((item) => item.done).length;
  const paidTotal = monthlyBills.reduce((total, item) => total + (item.done ? Number(item.amountPaid) || 0 : 0), 0);
  monthlyCount.textContent = `${paidCount} / ${monthlyBills.length} paid`;
  monthlyTotal.textContent = paidCount === monthlyBills.length
    ? `All paid: ${formatMoney(paidTotal)}`
    : `Paid total: ${formatMoney(paidTotal)}`;

  monthlyBills.filter((item) => !item.done).forEach((item) => {
    const row = document.createElement("div");
    row.className = "monthly-bill-item";
    if (item.custom) row.classList.add("is-custom");

    const copy = document.createElement("span");
    const title = document.createElement("strong");
    const company = document.createElement("span");
    const paidDateLabel = document.createElement("em");
    title.textContent = item.title;
    company.textContent = item.company;
    paidDateLabel.textContent = "Ready to confirm once date and amount are filled";
    copy.append(title, company, paidDateLabel);

    const paidDate = document.createElement("input");
    paidDate.className = "monthly-paid-date";
    paidDate.type = "date";
    paidDate.value = item.paidDate || isoToday;
    paidDate.addEventListener("change", () => {
      item.paidDate = paidDate.value;
      saveChecklist();
    });

    const amountPaid = document.createElement("input");
    amountPaid.className = "monthly-paid-amount";
    amountPaid.type = "number";
    amountPaid.min = "0";
    amountPaid.step = "0.01";
    amountPaid.placeholder = "Amount";
    amountPaid.value = item.amountPaid || "";
    amountPaid.setAttribute("aria-label", `${item.title} amount paid`);
    amountPaid.addEventListener("change", () => {
      item.amountPaid = Number(amountPaid.value) || 0;
      saveChecklist();
    });

    const confirmButton = document.createElement("button");
    confirmButton.className = "mini-button confirm-paid";
    confirmButton.type = "button";
    confirmButton.textContent = "Confirm Paid";
    confirmButton.addEventListener("click", () => {
      item.paidDate = paidDate.value || isoToday;
      item.amountPaid = Number(amountPaid.value) || 0;
      item.done = true;
      saveChecklist();
      render();
    });

    const stageGroup = renderBillStages(item);

    if (item.custom) {
      const deleteButton = document.createElement("button");
      deleteButton.className = "mini-button delete-button monthly-delete";
      deleteButton.type = "button";
      deleteButton.textContent = "Delete";
      deleteButton.addEventListener("click", () => {
        checklist = checklist.filter((bill) => bill.id !== item.id);
        saveChecklist();
        render();
      });
      row.append(copy, stageGroup, paidDate, amountPaid, confirmButton, deleteButton);
    } else {
      row.append(copy, stageGroup, paidDate, amountPaid, confirmButton);
    }
    monthlyTarget.append(row);
  });

  const paidBills = monthlyBills
    .filter((item) => item.done)
    .sort((a, b) => dateValue(a.paidDate) - dateValue(b.paidDate));
  paidLedgerTotal.textContent = `Total ${formatMoney(paidTotal)}`;

  if (!paidBills.length) {
    paidLedgerList.append(emptyState("No monthly bills paid yet."));
    return;
  }

  paidBills.forEach((item) => {
    const row = document.createElement("div");
    row.className = "paid-ledger-row";

    const title = document.createElement("strong");
    title.textContent = item.title;

    const company = document.createElement("span");
    company.textContent = item.company;

    const closeChecks = document.createElement("span");
    closeChecks.textContent = formatBillStages(item.stages);

    const date = document.createElement("span");
    date.textContent = formatDate(item.paidDate);

    const amount = document.createElement("strong");
    amount.textContent = formatMoney(item.amountPaid);

    const editButton = document.createElement("button");
    editButton.className = "mini-button";
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => {
      item.done = false;
      saveChecklist();
      render();
    });

    row.append(title, company, closeChecks, date, amount, editButton);
    paidLedgerList.append(row);
  });
}

function getVisibleTasks() {
  if (activeFilter === "today") {
    return tasks.filter((task) => task.due === isoToday && task.status !== "done");
  }
  if (activeFilter === "bills") {
    return tasks.filter((task) => task.lane === "Bills");
  }
  if (activeFilter === "done") {
    return tasks.filter((task) => task.status === "done");
  }
  return tasks.filter((task) => task.status !== "done");
}

function getCompletedSubtaskCount(task) {
  return task.subtasks.filter((item) => item.done).length;
}

function getTodayContentTask() {
  return (
    tasks.find((task) => task.title.toLowerCase() === "post content" && task.status !== "done") ||
    tasks.find((task) => task.lane === "Content" && task.subtasks && task.subtasks.length && task.status !== "done") ||
    tasks.find((task) => task.title.toLowerCase() === "post content")
  );
}

function createSocialChecklist() {
  return ["LinkedIn", "X / Twitter", "Instagram", "TikTok", "YouTube Shorts"].map((title) => ({
    id: createId(),
    title,
    done: false
  }));
}

function createBillStages() {
  return {
    rho: false,
    quickbooks: false,
    rippling: false
  };
}

function processCapturedNote(note) {
  const cleanedText = cleanMeetingNote(note.text);
  const match = findBestTaskMatch(note);

  if (match && match.score >= 3) {
    attachNoteToTask(match.task, note, cleanedText);
    note.status = "linked";
    note.linkedTaskId = match.task.id;
    note.cleanedText = cleanedText;
    note.suggestion = {
      kind: "linked",
      title: `Added to ${match.task.title}`,
      lane: match.task.lane,
      priority: match.task.priority,
      due: match.task.due
    };
    return;
  }

  note.cleanedText = cleanedText;
  const suggestion = triageNote({ ...note, text: cleanedText });
  note.suggestion = suggestion;

  if (suggestion.kind === "reference") {
    note.status = "reference";
    return;
  }

  createTaskFromNote(note);
  note.status = "converted";
}

function finalizeOpenNotes() {
  const result = { total: 0, linked: 0, created: 0, saved: 0, actions: [] };
  notesItems
    .filter((note) => note.status === "open")
    .forEach((note) => {
      result.total += 1;
      processCapturedNote(note);
      if (note.status === "linked") {
        result.linked += 1;
        result.actions.push(`Attached: ${note.suggestion.title.replace("Added to ", "")}`);
      }
      if (note.status === "converted") {
        result.created += 1;
        result.actions.push(`Created: ${note.suggestion.title}`);
      }
      if (note.status === "reference") {
        result.saved += 1;
        result.actions.push(`Saved: ${note.suggestion.title}`);
      }
    });
  return result;
}

function attachNoteToTask(task, note, cleanedText) {
  task.updates = task.updates || [];
  task.updates.unshift({
    id: `update-${createId()}`,
    noteId: note.id,
    text: cleanedText,
    rawText: note.text,
    context: note.context,
    date: note.date,
    createdAt: note.createdAt
  });
  task.notes = task.notes || "Captured from meeting notes.";
}

function findBestTaskMatch(note) {
  const noteText = `${note.text || ""} ${note.context || ""}`;
  const noteTokens = getMatchTokens(noteText);
  if (!noteTokens.length) return null;

  return tasks.reduce((best, task) => {
    const taskTokens = getMatchTokens(`${task.title} ${task.lane} ${task.notes}`);
    const overlap = noteTokens.filter((token) => taskTokens.includes(token));
    const phraseScore = getPhraseMatchScore(noteText, task);
    const score = overlap.length + phraseScore;
    if (!best || score > best.score) return { task, score };
    return best;
  }, null);
}

function getPhraseMatchScore(noteText, task) {
  const normalizedNote = normalizeForMatch(noteText);
  const normalizedTitle = normalizeForMatch(task.title);
  let score = 0;
  if (normalizedTitle && normalizedNote.includes(normalizedTitle)) score += 5;
  getTaskAliases(task).forEach((alias) => {
    if (alias.words.every((word) => normalizedNote.includes(word))) score += alias.score;
  });
  if (normalizedTitle.includes("conduit") && normalizedNote.includes("sign")) score += 3;
  if (normalizedTitle.includes("pager") && (normalizedNote.includes("fde") || normalizedNote.includes("pager"))) score += 3;
  if (normalizedTitle.includes("merch") && normalizedNote.includes("merch")) score += 3;
  if (normalizedTitle.includes("hotline") && normalizedNote.includes("hotline")) score += 3;
  if (normalizedTitle.includes("iso") && (normalizedNote.includes("iso") || normalizedNote.includes("soc"))) score += 3;
  return score;
}

function getTaskAliases(task) {
  const title = normalizeForMatch(task.title);
  const aliases = [];
  if (title.includes("conduit") || title.includes("sign")) {
    aliases.push(
      { words: ["sign"], score: 2 },
      { words: ["logo"], score: 3 },
      { words: ["metal"], score: 3 },
      { words: ["feet"], score: 2 },
      { words: ["tall"], score: 2 }
    );
  }
  if (title.includes("pager") || title.includes("fde")) {
    aliases.push(
      { words: ["pager"], score: 4 },
      { words: ["fde"], score: 4 },
      { words: ["emergency"], score: 2 },
      { words: ["phone"], score: 2 }
    );
  }
  if (title.includes("merch") || title.includes("onboarding")) {
    aliases.push(
      { words: ["merch"], score: 4 },
      { words: ["onboarding"], score: 3 },
      { words: ["evan"], score: 2 },
      { words: ["caro"], score: 1 }
    );
  }
  if (title.includes("iso") || title.includes("soc")) {
    aliases.push(
      { words: ["iso"], score: 4 },
      { words: ["soc"], score: 4 },
      { words: ["security"], score: 2 },
      { words: ["evidence"], score: 2 }
    );
  }
  if (title.includes("hotline")) {
    aliases.push(
      { words: ["hotline"], score: 4 },
      { words: ["automation"], score: 2 },
      { words: ["support"], score: 1 }
    );
  }
  return aliases;
}

function getMatchTokens(text) {
  const stopWords = new Set(["the", "and", "with", "from", "that", "this", "about", "needs", "need", "just", "should", "have", "been", "boss", "meeting", "today", "will", "into", "under", "blah"]);
  return normalizeForMatch(text)
    .split(" ")
    .filter((token) => token.length > 2 && !stopWords.has(token));
}

function normalizeForMatch(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/fde's/g, "fde")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanMeetingNote(text) {
  const cleaned = String(text || "")
    .replace(/\s+/g, " ")
    .replace(/\bblah\b/gi, "")
    .replace(/\bjust\b/gi, "")
    .replace(/\bfrom my meeting with my boss\b/gi, "")
    .trim();
  if (!cleaned) return "Review meeting note.";
  return `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1).replace(/\s+([,.])/g, "$1")}${/[.!?]$/.test(cleaned) ? "" : "."}`;
}

function triageNote(note) {
  const text = `${note.text || ""} ${note.context || ""}`.toLowerCase();
  const explicitTag = note.tag && note.tag !== "auto" ? note.tag : "";
  const isBill = explicitTag === "bill" || includesAny(text, ["bill", "pay", "invoice", "rho", "quickbooks", "rippling", "pg&e", "rent", "water", "trash", "insurance"]);
  const isContent = explicitTag === "content" || includesAny(text, ["post", "linkedin", "twitter", "tiktok", "instagram", "case study", "content"]);
  const isQuestion = explicitTag === "question" || includesAny(text, ["ask", "clarify", "question", "who approves", "what does done", "can i"]);
  const isReference = explicitTag === "reference" || includesAny(text, ["remember", "fyi", "note only", "reference"]);
  const isTask = explicitTag === "task" || includesAny(text, ["need to", "follow up", "send", "make", "order", "check", "create", "set up", "confirm"]);

  const match = findBestTaskMatch(note);
  if (match && match.score >= 2) return createSuggestion("task", note, match.task.lane, match.task.priority, `Review for ${match.task.title}`);
  if (isBill) return createSuggestion("bill", note, "Bills", "1");
  if (isContent) return createSuggestion("content", note, "Content", "1");
  if (isQuestion) return createSuggestion("question", note, "Admin", "2", "Ask manager");
  if (isReference && !isTask) return createSuggestion("reference", note, "Admin", "3", "Save reference");
  return createSuggestion("task", note, guessLane(text), isTask ? "2" : "3");
}

function createSuggestion(kind, note, lane, priority, prefix = "") {
  const cleaned = cleanNoteTitle(note.text);
  return {
    kind,
    title: prefix ? `${prefix}: ${cleaned}` : cleaned,
    lane,
    priority,
    due: kind === "reference" ? addDaysIso(3) : isoToday
  };
}

function cleanNoteTitle(text) {
  const cleaned = String(text || "")
    .replace(/\s+/g, " ")
    .replace(/^(note|todo|task|remember|fyi):\s*/i, "")
    .trim();
  if (!cleaned) return "Review captured note";
  return cleaned.length > 86 ? `${cleaned.slice(0, 83)}...` : cleaned;
}

function guessLane(text) {
  if (includesAny(text, ["office", "snack", "trash", "supplies", "sign", "pager"])) return "Ops";
  if (includesAny(text, ["onboarding", "merch", "team", "people", "hiring"])) return "People";
  if (includesAny(text, ["sales", "customer", "roi", "demo"])) return "Sales";
  return "Admin";
}

function includesAny(text, words) {
  return words.some((word) => text.includes(word));
}

function createTaskFromNote(note) {
  const suggestion = note.suggestion || triageNote(note);
  const cleanedText = note.cleanedText || cleanMeetingNote(note.text);
  tasks.unshift({
    id: createId(),
    title: suggestion.title,
    lane: suggestion.lane,
    priority: suggestion.priority,
    due: suggestion.due || isoToday,
    repeat: "none",
    status: "active",
    notes: [note.context, cleanedText].filter(Boolean).join(" · "),
    subtasks: suggestion.lane === "Content" ? createSocialChecklist() : [],
    createdAt: Date.now()
  });
}

function shouldUseSocialChecklist(lane, title) {
  return lane === "Content" || title.toLowerCase().includes("post content") || title.toLowerCase().includes("social");
}

function pill(text, className = "") {
  const span = document.createElement("span");
  span.className = className ? `pill ${className}` : "pill";
  span.textContent = text;
  return span;
}

function sortTasks(a, b) {
  return Number(a.priority) - Number(b.priority) || dateValue(a.due) - dateValue(b.due) || a.createdAt - b.createdAt;
}

function isDueSoon(due, days) {
  if (!due) return false;
  const dueDate = new Date(`${due}T00:00:00`);
  const limit = new Date(today);
  limit.setDate(limit.getDate() + days);
  return dueDate <= limit;
}

function isOverdue(due) {
  if (!due) return false;
  return new Date(`${due}T00:00:00`) < new Date(`${isoToday}T00:00:00`);
}

function dateValue(due) {
  return due ? new Date(`${due}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatMoney(value) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(Number(value) || 0);
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function addDaysIso(days) {
  const date = new Date(today);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

function nextWeekdayIso(dayNumber) {
  const date = new Date(today);
  const distance = (dayNumber + 7 - date.getDay()) % 7 || 7;
  date.setDate(date.getDate() + distance);
  return toIsoDate(date);
}

function getWeekKey(date) {
  const monday = new Date(date);
  const day = monday.getDay() || 7;
  monday.setDate(monday.getDate() - day + 1);
  return toIsoDate(monday);
}

function loadTasks() {
  const saved = localStorage.getItem(STORAGE_KEY);
  const loadedTasks = saved ? JSON.parse(saved) : seedTasks;
  return loadedTasks.map((task) => {
    if (shouldUseSocialChecklist(task.lane, task.title) && !task.subtasks) {
      return { ...task, subtasks: createSocialChecklist() };
    }
    return { ...task, subtasks: task.subtasks || [] };
  });
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function loadChecklist() {
  const saved = localStorage.getItem(CHECKLIST_KEY);
  if (!saved) return seedChecklist;
  const savedChecklist = JSON.parse(saved);
  const savedIds = new Set(savedChecklist.map((item) => item.id));
  const missingItems = seedChecklist.filter((item) => !savedIds.has(item.id));
  return [...savedChecklist, ...missingItems].map((item) => {
    if (item.type === "monthly-bill") {
      return {
        ...item,
        paidDate: typeof item.paidDate === "undefined" ? (item.done ? isoToday : "") : item.paidDate,
        amountPaid: typeof item.amountPaid === "undefined" ? 0 : Number(item.amountPaid) || 0,
        stages: { ...createBillStages(), ...(item.stages || {}) }
      };
    }
    if (item.id === "accounting-report") {
      return { ...item, details: "Check Rho, QuickBooks, and Rippling" };
    }
    return item;
  });
}

function saveChecklist() {
  localStorage.setItem(CHECKLIST_KEY, JSON.stringify(checklist));
}

function loadWeeklyTasks() {
  const saved = localStorage.getItem(WEEKLY_TASKS_KEY);
  if (!saved) return seedWeeklyTasks;
  const savedTasks = JSON.parse(saved);
  const savedIds = new Set(savedTasks.map((item) => item.id));
  const missingItems = seedWeeklyTasks.filter((item) => !savedIds.has(item.id));
  return [...savedTasks, ...missingItems];
}

function saveWeeklyTasks() {
  localStorage.setItem(WEEKLY_TASKS_KEY, JSON.stringify(weeklyTasks));
}

function loadNotesItems() {
  const saved = localStorage.getItem(NOTES_KEY);
  if (saved) {
    return JSON.parse(saved).map((item) => ({
      ...item,
      suggestion: item.suggestion || triageNote(item)
    }));
  }

  const oldWaiting = localStorage.getItem(WAITING_KEY);
  if (!oldWaiting) return [];
  return JSON.parse(oldWaiting).map((item) => {
    const note = {
      id: `note-${item.id || createId()}`,
      text: item.need || "",
      context: item.person || "",
      tag: "task",
      status: item.done ? "saved" : "open",
      date: item.followUp || isoToday,
      createdAt: item.createdAt || Date.now()
    };
    return { ...note, suggestion: triageNote(note) };
  });
}

function saveNotesItems() {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notesItems));
}

function loadAccessItems() {
  const saved = localStorage.getItem(ACCESS_KEY);
  if (!saved) return seedAccessItems.map((item) => ({ ...item }));
  const savedItems = JSON.parse(saved);
  const savedIds = new Set(savedItems.map((item) => item.id));
  const missingItems = seedAccessItems.filter((item) => !savedIds.has(item.id));
  return [...savedItems, ...missingItems].map((item) => ({
    username: "",
    password: "",
    url: "",
    notes: "",
    revealed: false,
    ...item
  }));
}

function saveAccessItems() {
  localStorage.setItem(ACCESS_KEY, JSON.stringify(accessItems));
}

function resetDailyItemsIfNeeded() {
  const lastOpened = localStorage.getItem(LAST_OPENED_KEY);
  const lastMonth = localStorage.getItem(LAST_MONTH_KEY);
  const lastWeek = localStorage.getItem(LAST_WEEK_KEY);
  if (lastOpened && lastOpened !== isoToday) {
    tasks = tasks.map((task) => {
      if (task.repeat !== "daily") return task;
      return {
        ...task,
        due: isoToday,
        status: "active",
        subtasks: task.subtasks.map((subtask) => ({ ...subtask, done: false }))
      };
    });
    checklist = checklist.map((item) => (item.cadence === "Daily" ? { ...item, done: false } : item));
    saveTasks();
    saveChecklist();
  }
  if (lastMonth && lastMonth !== currentMonthKey) {
    checklist = checklist.map((item) => (
      item.cadence === "Monthly"
        ? { ...item, done: false, paidDate: "", amountPaid: 0, stages: createBillStages() }
        : item
    ));
    saveChecklist();
  }
  if (lastWeek && lastWeek !== currentWeekKey) {
    weeklyTasks = weeklyTasks.map((item) => ({ ...item, done: false }));
    saveWeeklyTasks();
  }
  localStorage.setItem(LAST_OPENED_KEY, isoToday);
  localStorage.setItem(LAST_MONTH_KEY, currentMonthKey);
  localStorage.setItem(LAST_WEEK_KEY, currentWeekKey);
}

function buildStandupUpdate() {
  const activeToday = tasks
    .filter((task) => task.status === "active")
    .filter((task) => task.priority === "1" || task.due === isoToday || isOverdue(task.due))
    .sort(sortTasks)
    .slice(0, 5);
  const waitingTasks = tasks.filter((task) => task.status === "waiting").sort(sortTasks).slice(0, 5);
  const openNotes = notesItems
    .filter((item) => item.status === "open")
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);
  const monthlyBills = checklist.filter((item) => item.type === "monthly-bill");
  const paidBills = monthlyBills.filter((bill) => bill.done);
  const paidTotal = paidBills.reduce((total, bill) => total + (Number(bill.amountPaid) || 0), 0);
  const contentTask = getTodayContentTask();
  const contentLine = contentTask
    ? `${getCompletedSubtaskCount(contentTask)}/${contentTask.subtasks.length} content channels posted`
    : "No content task found";

  return [
    "Alberto daily update",
    "",
    `Content: ${contentLine}`,
    `Monthly bills: ${paidBills.length}/${monthlyBills.length} confirmed, ${formatMoney(paidTotal)} paid`,
    "",
    "Top priorities:",
    ...activeToday.map((task) => `- ${task.title}`),
    "",
    "Notes to triage:",
    ...(openNotes.length ? openNotes.map((item) => `- ${item.suggestion.title}`) : ["- Nothing open"]),
    "",
    "Waiting on:",
    ...(
      waitingTasks.length
        ? waitingTasks.map((task) => `- ${task.title}`)
        : ["- Nothing logged"]
    )
  ].join("\n");
}

function exportMonthlyBillSummary() {
  const monthlyBills = checklist.filter((item) => item.type === "monthly-bill");
  if (!monthlyBills.length) {
    alert("Add at least one monthly bill before exporting.");
    return;
  }

  const total = monthlyBills.reduce((sum, bill) => sum + (bill.done ? Number(bill.amountPaid) || 0 : 0), 0);
  const rows = monthlyBills
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? -1 : 1;
      return dateValue(a.paidDate) - dateValue(b.paidDate);
    })
    .map((bill) => `
      <tr>
        <td>${escapeHtml(bill.title)}</td>
        <td>${escapeHtml(bill.company)}</td>
        <td>${escapeHtml(bill.done ? "Paid" : "Unpaid")}</td>
        <td>${escapeHtml(bill.done ? formatDate(bill.paidDate) : "")}</td>
        <td>${bill.done ? Number(bill.amountPaid) || 0 : ""}</td>
        <td>${bill.stages && bill.stages.rho ? "Yes" : "No"}</td>
        <td>${bill.stages && bill.stages.quickbooks ? "Yes" : "No"}</td>
        <td>${bill.stages && bill.stages.rippling ? "Yes" : "No"}</td>
      </tr>
    `)
    .join("");

  const workbook = `
    <html>
      <head>
        <meta charset="utf-8" />
      </head>
      <body>
        <table>
          <tr><th colspan="8">Monthly Bill Summary - ${escapeHtml(currentMonthKey)}</th></tr>
          <tr>
            <th>Bill</th>
            <th>Company</th>
            <th>Status</th>
            <th>Paid Date</th>
            <th>Amount Paid</th>
            <th>Rho Checked</th>
            <th>QuickBooks Matched</th>
            <th>Rippling Reviewed</th>
          </tr>
          ${rows}
          <tr>
            <td colspan="4"><strong>Paid Total</strong></td>
            <td><strong>${total}</strong></td>
            <td colspan="3"></td>
          </tr>
        </table>
      </body>
    </html>
  `;

  downloadFile(workbook, `monthly-bills-${currentMonthKey}.xls`, "application/vnd.ms-excel");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildManagerQuestions() {
  return [
    "Clarifying questions",
    "",
    "1. What are my top 3 priorities for this week?",
    "2. Can you confirm which tasks are Alberto-owned versus Caro/Daniel-owned?",
    "3. For bills, am I tracking only or actually submitting payments?",
    "4. Who approves bills, insurance, merch, office purchases, and sales materials?",
    "5. For ISO/SOC, am I owning evidence collection, coordination, documentation, or all of it?",
    "6. What social channels should I post on daily, and who approves posts?",
    "7. What should the weekly accounting report include?",
    "8. What does done look like for the automation hotline?"
  ].join("\n");
}

function applyTaskTemplate(type) {
  const templates = {
    content: {
      title: "Post content",
      lane: "Content",
      priority: "1",
      due: isoToday,
      repeat: "daily",
      notes: "Post across all required channels and mark each channel done."
    },
    followup: {
      title: "Follow up with ",
      lane: "People",
      priority: "1",
      due: isoToday,
      repeat: "none",
      notes: "Ask for owner, approval, deadline, and next step."
    },
    approval: {
      title: "Get approval for ",
      lane: "Ops",
      priority: "1",
      due: isoToday,
      repeat: "none",
      notes: "Confirm approver, budget, vendor, and proof needed."
    },
    sales: {
      title: "Update sales materials",
      lane: "Sales",
      priority: "2",
      due: addDaysIso(2),
      repeat: "none",
      notes: "Collect latest screenshots, customer proof, ROI points, and review owner."
    }
  };
  const selected = templates[type];
  if (!selected) return;

  form.elements.title.value = selected.title;
  form.elements.lane.value = selected.lane;
  form.elements.priority.value = selected.priority;
  form.elements.due.value = selected.due;
  form.elements.repeat.value = selected.repeat;
  form.elements.notes.value = selected.notes;
  form.elements.title.focus();
}

async function copyText(text, successMessage) {
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      alert(successMessage);
      return;
    } catch (error) {
      downloadFile(text, "alberto-update.txt", "text/plain");
      return;
    }
  }
  downloadFile(text, "alberto-update.txt", "text/plain");
}

const initialTab = location.hash ? location.hash.slice(1) : "today";
showTab(["today", "tasks", "notes", "bills", "weekly", "access", "priorities"].includes(initialTab) ? initialTab : "today");
render();
