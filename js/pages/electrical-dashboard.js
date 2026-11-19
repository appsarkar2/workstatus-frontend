// frontend/js/pages/electrical-dashboard.js

let currentView = "scheme_head"; // "scheme_head" or "division"
let orgData = {};
let allSchemes = [];
let activeRow = null;

async function init() {
    try {
        const results = await Promise.all([
            apiFetch("/api/org-structure"),
            BlockAPI("electrical_works").list()
        ]);
        orgData = results[0];
        allSchemes = results[1].items || [];
    } catch (e) {
        console.error("Failed to load initial org/schemes data:", e);
    }

    populateOrgFilters();
    setupEventListeners();
    await fetchOverviewData();
}

function setupEventListeners() {
    const zoneEl = document.getElementById("filterZone");
    const regionEl = document.getElementById("filterRegion");
    const divisionEl = document.getElementById("filterDivision");
    const headEl = document.getElementById("filterSchemeHead");
    const statusEl = document.getElementById("filterStatus");

    if (zoneEl) zoneEl.addEventListener("change", () => { updateFilterRegions(); fetchOverviewData(); });
    if (regionEl) regionEl.addEventListener("change", () => { updateFilterDivisions(); fetchOverviewData(); });
    if (divisionEl) divisionEl.addEventListener("change", fetchOverviewData);
    if (headEl) headEl.addEventListener("change", fetchOverviewData);
    if (statusEl) statusEl.addEventListener("change", fetchOverviewData);

    const btnDownload = document.getElementById("btnDownload");
    if (btnDownload) {
        btnDownload.addEventListener("click", downloadCSV);
    }
}

function populateOrgFilters() {
    const zoneSelect = document.getElementById("filterZone");
    if (!zoneSelect || !orgData.zones) return;

    zoneSelect.innerHTML = '<option value="">All Zones</option>';
function updateFilterRegions() {
    const zoneName = document.getElementById("filterZone").value;
    const regSelect = document.getElementById("filterRegion");
    const divSelect = document.getElementById("filterDivision");

    regSelect.innerHTML = '<option value="">All Regions</option>';
    divSelect.innerHTML = '<option value="">All Divisions</option>';
    divSelect.disabled = true;

    if (!zoneName) {
        regSelect.disabled = true;
        return;
    }

    const zone = orgData.zones.find(z => z.name === zoneName);
    if (zone && zone.regions) {
        zone.regions.forEach(r => {
            regSelect.innerHTML += `<option value="${r.name}">${r.name}</option>`;
        });
        regSelect.disabled = false;
    } else {
        regSelect.disabled = true;
    }
}

function updateFilterDivisions() {
    const zoneName = document.getElementById("filterZone").value;
    const regName = document.getElementById("filterRegion").value;
    const divSelect = document.getElementById("filterDivision");

    divSelect.innerHTML = '<option value="">All Divisions</option>';

    if (!zoneName || !regName) {
        divSelect.disabled = true;
        return;
    }

    const zone = orgData.zones.find(z => z.name === zoneName);
    const region = zone?.regions.find(r => r.name === regName);

    if (region && region.divisions) {
        region.divisions.forEach(d => {
            divSelect.innerHTML += `<option value="${d}">${d}</option>`;
        });
        divSelect.disabled = false;
    } else {
        divSelect.disabled = true;
    }
}
async function fetchOverviewData() {
    try {
        const zoneVal = document.getElementById("filterZone").value;
        const regionVal = document.getElementById("filterRegion").value;
        const divisionVal = document.getElementById("filterDivision").value;
        const headVal = document.getElementById("filterSchemeHead")?.value;
        const statusVal = document.getElementById("filterStatus")?.value;

        const params = new URLSearchParams();
        if (zoneVal) params.append("zone", zoneVal);
        if (regionVal) params.append("region", regionVal);
        if (divisionVal) params.append("division", divisionVal);
        if (currentView === "scheme_head" && headVal && headVal !== "All") {
            params.append("voltage", headVal);
        }
        if (statusVal) {
            params.append("status", statusVal);
        }

        let endpoint = currentView === "division" 
            ? `/api/blocks/electrical_works/division-overview?${params.toString()}`
            : `/api/blocks/electrical_works/overview-table?${params.toString()}`;

        const groupedData = await apiFetch(endpoint);

        let totalSchemes = 0;
        let completedSchemes = 0;
        let inProgressSchemes = 0;
        let pendingSchemes = 0;

        const tableBody = document.getElementById("overviewTableBody");
        const tableHeaders = document.getElementById("overviewTableHeaders");
        
        if (currentView === "division") {
            if (tableHeaders) {
                tableHeaders.innerHTML = `
                    <th>Division Name</th>
                    <th>Status</th>
                    <th>Total Schemes</th>
                    <th>Completed</th>
                    <th>In Progress</th>
                    <th>Pending</th>
                    <th>Completion Rate</th>
                    <th>Actions</th>
                `;
            }
        } else {
            if (tableHeaders) {
                tableHeaders.innerHTML = `
                    <th>Scheme Head</th>
                    <th>Division</th>
                    <th>Status</th>
                    <th>Total Schemes</th>
                    <th>Completed</th>
                    <th>In Progress</th>
                    <th>Pending</th>
                    <th>Completion Rate</th>
                    <th>Actions</th>
                `;
            }
        }

        let html = "";
        let rowsArray = [];

        if (Array.isArray(groupedData)) {
            rowsArray = groupedData;
        } else if (groupedData && typeof groupedData === "object") {
            rowsArray = Object.values(groupedData);
        rowsArray.forEach(row => {
            const tot = row.total || 0;
            const comp = row.completed || 0;
            const prog = row.in_progress || 0;
            const pend = row.pending || 0;
            const rate = tot > 0 ? Math.round((comp / tot) * 100) : 0;

            totalSchemes += tot;
            completedSchemes += comp;
            inProgressSchemes += prog;
            pendingSchemes += pend;

            const rowStatus = statusVal || "All Statuses";

            if (currentView === "division") {
                const encoded = encodeURIComponent(JSON.stringify(row));
                html += `
                    <tr class="clickable-row" onclick="openDivisionDrawer('${encoded}')">
                        <td style="font-weight: 800; color: #0f172a;">${escapeHtml(row.division || "—")}</td>
                        <td><span class="status-badge" style="background:#e0f2fe; color:#0369a1;">${escapeHtml(rowStatus)}</span></td>
                        <td style="font-weight: 800; color: #2563eb;">${tot}</td>
                        <td style="color: #10b981; font-weight: 700;">${comp}</td>
                        <td style="color: #7c3aed; font-weight: 700;">${prog}</td>
                        <td style="color: #d97706; font-weight: 700;">${pend}</td>
                        <td>
                            <div class="progress-container">
                                <div class="progress-bar-bg">
                                    <div class="progress-bar-fill" style="width: ${rate}%;"></div>
                                </div>
                                <span style="font-size: 11px; font-weight: 800; color: #475569;">${rate}%</span>
                            </div>
                        </td>
                        <td>
                            <button class="btn btn-light" style="padding: 4px 10px; font-size: 11px;" onclick="event.stopPropagation(); openDivisionDrawer('${encoded}')">View Breakdown</button>
                        </td>
                    </tr>
                `;
            } else {
                const encoded = encodeURIComponent(JSON.stringify(row));
                html += `
                    <tr class="clickable-row" onclick="openSchemeHeadDrawer('${encoded}')">
                        <td style="font-weight: 800; color: #0f172a;">${escapeHtml(row.scheme_head || "—")}</td>
                        <td style="font-weight: 600; color: #475569;">${escapeHtml(row.division || "All Divisions")}</td>
                        <td><span class="status-badge" style="background:#e0f2fe; color:#0369a1;">${escapeHtml(rowStatus)}</span></td>
                        <td style="font-weight: 800; color: #2563eb;">${tot}</td>
                        <td style="color: #10b981; font-weight: 700;">${comp}</td>
                        <td style="color: #7c3aed; font-weight: 700;">${prog}</td>
                        <td style="color: #d97706; font-weight: 700;">${pend}</td>
                        <td>
                            <div class="progress-container">
                                <div class="progress-bar-bg">
                                    <div class="progress-bar-fill" style="width: ${rate}%;"></div>
                                </div>
                                <span style="font-size: 11px; font-weight: 800; color: #475569;">${rate}%</span>
                            </div>
                        </td>
                        <td>
                            <button class="btn btn-light" style="padding: 4px 10px; font-size: 11px;" onclick="event.stopPropagation(); openSchemeHeadDrawer('${encoded}')">View Breakdown</button>
                        </td>
                    </tr>
                `;
            }
        });

        tableBody.innerHTML = html;
        updateStats(totalSchemes, completedSchemes, inProgressSchemes, pendingSchemes);

    } catch (e) {
        console.error("Failed to fetch overview data:", e);
        const colspan = currentView === "division" ? 8 : 9;
        document.getElementById("overviewTableBody").innerHTML = `<tr><td colspan="${colspan}" style="color:red; text-align:center; padding:20px;">Error loading data: ${escapeHtml(e.message)}</td></tr>`;
    }
}

function updateStats(total, completed, inProgress, pending) {
    const elTotal = document.getElementById("statTotal");
    const elCompleted = document.getElementById("statCompleted");
    const elInProgress = document.getElementById("statInProgress");
async function deleteScheme(id) {
    const confirmed = await showConfirm({
        title: "Delete Scheme",
        message: "Are you sure you want to delete this electrical scheme? This action cannot be undone.",
        confirmText: "Yes, Delete",
        cancelText: "Cancel"
    });

    if (!confirmed) return;

    try {
        await BlockAPI('electrical_works').delete(id);
        showToast("Scheme deleted successfully", "success");
        await fetchOverviewData();
    } catch (err) {
        showToast(err.message || "Failed to delete scheme", "error");
    }
}

function downloadCSV() {
    const tableHeaders = document.querySelectorAll("#overviewTableHeaders th");
    const headers = Array.from(tableHeaders).map(th => th.innerText.trim()).filter(h => h !== "Actions");

    const rows = document.querySelectorAll("#overviewTableBody tr");
    if (rows.length === 0 || (rows.length === 1 && rows[0].innerText.includes("No schemes"))) {
        showToast("No data available to download", "error");
        return;
    }

    let csvRows = [];
    csvRows.push(headers.join(","));

    rows.forEach(row => {
        const cols = row.querySelectorAll("td");
        if (cols.length < headers.length) return;
        let data = [];
        for (let i = 0; i < headers.length; i++) {
            let text = cols[i].innerText.replace(/[\n\r]+/g, " ").trim();
            text = `"${text.replace(/"/g, '""')}"`;
            data.push(text);
        }
        csvRows.push(data.join(","));
    });

    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
function openSchemeHeadDrawer(encodedData) {
    activeRow = JSON.parse(decodeURIComponent(encodedData));
    
    document.getElementById("drawerTitle").innerText = `Scheme Head: ${activeRow.scheme_head || "General"}`;
    document.getElementById("drawerSubTitle").innerText = `Total Schemes: ${activeRow.total || 0}`;
    
    const statuses = {
        "Proposal to Initiate": 0, 
        "Approval pending": 0, 
        "TAA issued, work yet to start": 0,
        "Work in progress": 0, 
        "Completed": 0, 
        "Not updated": 0
    };

    const relevantSchemes = allSchemes.filter(s => s.scheme_head === activeRow.scheme_head && (!activeRow.division || s.division === activeRow.division));

    relevantSchemes.forEach(s => {
        if (s.status === "completed") statuses["Completed"]++;
        else if (s.current_stage === 1) statuses["Proposal to Initiate"]++;
        else if (s.current_stage === 2) statuses["Approval pending"]++;
        else if (s.current_stage === 3) statuses["TAA issued, work yet to start"]++;
        else if (s.current_stage === 4) statuses["Work in progress"]++;
        else statuses["Not updated"]++;
    });

    let bodyHtml = `
        <a href="/electrical-list.html?head=${encodeURIComponent(activeRow.scheme_head)}${activeRow.division ? '&division=' + encodeURIComponent(activeRow.division) : ''}" class="status-menu-item all-item">
            <span>View All Schemes</span>
            <span class="count">${activeRow.total}</span>
        </a>
    `;

    Object.keys(statuses).forEach(st => {
        const count = statuses[st];
        let url = `/electrical-list.html?head=${encodeURIComponent(activeRow.scheme_head)}&status=${encodeURIComponent(st)}`;
        if (activeRow.division) {
            url += `&division=${encodeURIComponent(activeRow.division)}`;
        }
        
        bodyHtml += `
            <a href="${url}" class="status-menu-item">
                <span>${st}</span>
                <span class="count">${count}</span>
            </a>
        `;
    });

    document.getElementById("drawerBody").innerHTML = bodyHtml;
    
    document.getElementById("drawerOverlay").classList.add("show");
    document.getElementById("sideDrawer").classList.add("show");
}

function openDivisionDrawer(encodedData) {
    activeRow = JSON.parse(decodeURIComponent(encodedData));
    
    document.getElementById("drawerTitle").innerText = `Division: ${activeRow.division}`;
    document.getElementById("drawerSubTitle").innerText = `Total Schemes: ${activeRow.total}`;
    
    const statuses = {
        "Proposal to Initiate": 0, 
        "Approval pending": 0, 
        "TAA issued, work yet to start": 0,
        "Work in progress": 0, 
        "Completed": 0, 
        "Not updated": 0
    };

    const relevantSchemes = allSchemes.filter(s => s.division === activeRow.division);

    relevantSchemes.forEach(s => {
        if (s.status === "completed") statuses["Completed"]++;
        else if (s.current_stage === 1) statuses["Proposal to Initiate"]++;
        else if (s.current_stage === 2) statuses["Approval pending"]++;
        else if (s.current_stage === 3) statuses["TAA issued, work yet to start"]++;
        else if (s.current_stage === 4) statuses["Work in progress"]++;
        else statuses["Not updated"]++;
    });

    let bodyHtml = `
        <a href="/electrical-list.html?division=${encodeURIComponent(activeRow.division)}" class="status-menu-item all-item">
            <span>View All Schemes</span>
            <span class="count">${activeRow.total}</span>
        </a>
    `;

    Object.keys(statuses).forEach(st => {
        const count = statuses[st];
        const url = `/electrical-list.html?division=${encodeURIComponent(activeRow.division)}&status=${encodeURIComponent(st)}`;
        
        bodyHtml += `
            <a href="${url}" class="status-menu-item">
                <span>${st}</span>
                <span class="count">${count}</span>
            </a>
        `;
    });

    document.getElementById("drawerBody").innerHTML = bodyHtml;
    
    document.getElementById("drawerOverlay").classList.add("show");
    document.getElementById("sideDrawer").classList.add("show");
}

function closeDrawer() {
    document.getElementById("drawerOverlay").classList.remove("show");
    document.getElementById("sideDrawer").classList.remove("show");
}

init();

    link.setAttribute("href", url);
    link.setAttribute("download", `Electrical_Schemes_Overview_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("CSV downloaded successfully", "success");
}

    const elPending = document.getElementById("statPending");

    if (elTotal) elTotal.innerText = total;
    if (elCompleted) elCompleted.innerText = completed;
    if (elInProgress) elInProgress.innerText = inProgress;
    if (elPending) elPending.innerText = pending;
}

        }

        if (rowsArray.length === 0) {
            const colspan = currentView === "division" ? 8 : 9;
            tableBody.innerHTML = `<tr><td colspan="${colspan}" style="text-align:center; padding: 30px; color:#64748b;">No schemes found matching the filters.</td></tr>`;
            updateStats(0, 0, 0, 0);
            return;
        }


function switchView(viewType) {
    currentView = viewType;
    document.getElementById("btnTabSchemeHead").className = `btn ${currentView === 'scheme_head' ? 'btn-primary' : 'btn-light'}`;
    document.getElementById("btnTabDivision").className = `btn ${currentView === 'division' ? 'btn-primary' : 'btn-light'}`;

    const filterCategory = document.getElementById("filterCategoryContainer");
    if (currentView === "scheme_head") {
        if (filterCategory) filterCategory.style.display = "block";
    } else {
        if (filterCategory) filterCategory.style.display = "none";
    }
    fetchOverviewData();
}

    orgData.zones.forEach(z => {
        zoneSelect.innerHTML += `<option value="${z.name}">${z.name}</option>`;
    });
}
