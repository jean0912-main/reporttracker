const STORAGE_KEY = "room-utilities-tracker-data";
const form = document.getElementById("report-form");
const editForm = document.getElementById("edit-form");
const reportsContainer = document.getElementById("reportsContainer");
const searchInput = document.getElementById("searchInput");
const totalCount = document.getElementById("totalCount");
const pendingCount = document.getElementById("pendingCount");
const progressCount = document.getElementById("progressCount");
const completedCount = document.getElementById("completedCount");
const filterTags = document.querySelectorAll(".tag");
const exportBtn = document.getElementById("exportBtn");
const editModal = document.getElementById("editModal");
const modalClose = document.getElementById("modalClose");
const modalCancel = document.getElementById("modalCancel");

let reports = loadReports();
let currentFilter = "all";
let editingReportId = null;

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const report = {
    id: crypto.randomUUID(),
    room: document.getElementById("room").value.trim(),
    issueType: document.getElementById("issueType").value.trim(),
    reportDate: document.getElementById("reportDate").value,
    status: document.getElementById("status").value,
    notes: document.getElementById("notes").value.trim(),
  };

  reports.unshift(report);
  saveReports();
  renderReports();
  form.reset();
  document.getElementById("reportDate").value = new Date().toISOString().split("T")[0];
});

searchInput.addEventListener("input", renderReports);

filterTags.forEach((tag) => {
  tag.addEventListener("click", () => {
    filterTags.forEach((t) => t.classList.remove("active"));
    tag.classList.add("active");
    currentFilter = tag.dataset.filter;
    renderReports();
  });
});

exportBtn.addEventListener("click", exportReports);

modalClose.addEventListener("click", closeEditModal);
modalCancel.addEventListener("click", closeEditModal);
editForm.addEventListener("submit", saveEditedReport);

editModal.addEventListener("click", (e) => {
  if (e.target === editModal) closeEditModal();
});

function loadReports() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [
        {
          id: crypto.randomUUID(),
          room: "Classroom",
          issueType: "Broken projector",
          reportDate: new Date().toISOString().split("T")[0],
          status: "In Progress",
          notes: "Front projector not displaying. HDMI cable tested, issue is in projector unit. Awaiting replacement part.",
        },
        {
          id: crypto.randomUUID(),
          room: "Computer Laboratory",
          issueType: "Non-functional workstation",
          reportDate: new Date(Date.now() - 86400000).toISOString().split("T")[0],
          status: "Completed",
          notes: "Computer #5 was not turning on. Power supply replaced successfully.",
        },
        {
          id: crypto.randomUUID(),
          room: "Classroom",
          issueType: "Air conditioning malfunction",
          reportDate: new Date(Date.now() - 172800000).toISOString().split("T")[0],
          status: "Pending",
          notes: "AC unit making unusual noise and not cooling effectively. Technician needed for inspection.",
        },
      ];
    }
    return JSON.parse(raw);
  } catch (error) {
    console.error("Unable to load reports", error);
    return [];
  }
}

function saveReports() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

function renderReports() {
  const query = searchInput.value.trim().toLowerCase();
  let filtered = reports.filter((report) => {
    const haystack = `${report.room} ${report.issueType} ${report.notes}`.toLowerCase();
    return haystack.includes(query);
  });

  if (currentFilter !== "all") {
    filtered = filtered.filter(
      (report) => report.room === currentFilter || report.status === currentFilter
    );
  }

  reportsContainer.innerHTML = "";

  if (!filtered.length) {
    reportsContainer.innerHTML = `<div class="empty-state"><p>No reports found. Create a new issue report to get started.</p></div>`;
    updateSummary(reports);
    return;
  }

  filtered.forEach((report) => {
    const card = createReportCard(report);
    reportsContainer.appendChild(card);
  });

  updateSummary(reports);
}

function createReportCard(report) {
  const card = document.createElement("div");
  card.className = "report-card";
  card.innerHTML = `
    <div class="report-header">
      <h3 class="report-title">${escapeHtml(report.issueType)}</h3>
      <span class="badge ${getStatusClass(report.status)}">${escapeHtml(report.status)}</span>
    </div>
    <div class="report-body">
      <div class="report-label">Room</div>
      <div class="report-value report-room">${escapeHtml(report.room)}</div>
      <div class="report-label">Date</div>
      <div class="report-value">${escapeHtml(report.reportDate)}</div>
    </div>
    ${report.notes ? `<div class="report-details">${escapeHtml(report.notes)}</div>` : ""}
    <div class="report-footer">
      <span class="report-meta">ID: ${report.id.slice(0, 8)}</span>
      <div class="report-actions">
        <button class="btn-edit" data-id="${report.id}">Edit</button>
        <button class="btn-delete" data-id="${report.id}">Remove</button>
      </div>
    </div>
  `;

  const deleteBtn = card.querySelector(".btn-delete");
  deleteBtn.addEventListener("click", () => {
    reports = reports.filter((r) => r.id !== report.id);
    saveReports();
    renderReports();
  });

  const editBtn = card.querySelector(".btn-edit");
  editBtn.addEventListener("click", () => {
    openEditModal(report);
  });

  return card;
}

function updateSummary(allReports) {
  totalCount.textContent = allReports.length;
  pendingCount.textContent = allReports.filter((report) => report.status === "Pending").length;
  progressCount.textContent = allReports.filter((report) => report.status === "In Progress").length;
  completedCount.textContent = allReports.filter((report) => report.status === "Completed").length;
}

function getStatusClass(status) {
  if (status === "Pending") return "pending";
  if (status === "Completed") return "completed";
  return "progress";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function exportReports() {
  if (!reports.length) {
    alert("No reports to export.");
    return;
  }

  // CSV header
  const headers = ["ID", "Room", "Issue Type", "Date Reported", "Status", "Details"];
  
  // CSV rows
  const rows = reports.map((report) => [
    report.id.slice(0, 8),
    report.room,
    report.issueType,
    report.reportDate,
    report.status,
    report.notes || "",
  ]);

  // Escape CSV values that contain commas or quotes
  const escapeCsvValue = (value) => {
    if (typeof value !== "string") return value;
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  // Build CSV content
  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map(escapeCsvValue).join(",")),
  ].join("\n");

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `facility-reports-${new Date().toISOString().split("T")[0]}.csv`
  );
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function openEditModal(report) {
  editingReportId = report.id;
  document.getElementById("editReportId").value = report.id;
  document.getElementById("editRoom").value = report.room;
  document.getElementById("editIssueType").value = report.issueType;
  document.getElementById("editStatus").value = report.status;
  document.getElementById("editDate").value = report.reportDate;
  document.getElementById("editNotes").value = report.notes || "";
  editModal.classList.add("active");
}

function closeEditModal() {
  editModal.classList.remove("active");
  editingReportId = null;
  editForm.reset();
}

function saveEditedReport(e) {
  e.preventDefault();

  const reportId = document.getElementById("editReportId").value;
  const report = reports.find((r) => r.id === reportId);

  if (!report) return;

  report.status = document.getElementById("editStatus").value;
  report.notes = document.getElementById("editNotes").value.trim();

  saveReports();
  renderReports();
  closeEditModal();
}

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("reportDate").value = new Date().toISOString().split("T")[0];
  renderReports();
});
