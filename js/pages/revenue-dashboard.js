// -- Revenue Dashboard JS Logic (Cascading Org Structure & Dashboard Summary) --

let donutChartInstance = null;
let barChartInstance = null;
let orgData = { zones: {} };
let allEntries = [];

document.addEventListener("DOMContentLoaded", async () => {
    updateLastUpdatedBadge();

    // 1. Fetch Org Structure & populate initial Zone dropdown
    await loadOrgStructure();

    // 2. Initial Data Fetch
    await loadDashboardData();
    await loadRawTable();

    // 3. Attach filter change listeners
    const dateEl = document.getElementById("dateFilter");
    const zoneEl = document.getElementById("zoneFilter");
    const regionEl = document.getElementById("regionFilter");
    const divisionEl = document.getElementById("divisionFilter");
    const cccEl = document.getElementById("cccFilter");

    if (dateEl) dateEl.addEventListener("change", loadDashboardData);
    if (zoneEl) zoneEl.addEventListener("change", () => { onZoneChange(); loadDashboardData(); });
    if (regionEl) regionEl.addEventListener("change", () => { onRegionChange(); loadDashboardData(); });
    if (divisionEl) divisionEl.addEventListener("change", () => { onDivisionChange(); loadDashboardData(); });
    if (cccEl) cccEl.addEventListener("change", loadDashboardData);

    // 4. CSV Upload Handler
    const csvInput = document.getElementById("csvUpload");
    if (csvInput) {
        csvInput.addEventListener("change", async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append("file", file);

            try {
                const token = getToken();
                const res = await fetch(`${API_BASE}/api/blocks/revenue_work/bulk-upload`, {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${token}` },
                    body: formData
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.detail || "Upload failed");

                alert(`Successfully uploaded ${data.count} records!`);
                csvInput.value = "";
                await loadDashboardData();
                await loadRawTable();
            } catch (err) {
                alert("Error uploading CSV: " + err.message);
            }
        });
    }

    switchTab('charts');
});

function updateLastUpdatedBadge() {
    const badge = document.getElementById("lastUpdatedBadge");
    if (badge) {
        const now = new Date();
        const formattedTime = now.toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric'
        }) + ' at ' + now.toLocaleTimeString('en-IN', {
            hour: '2-digit', minute: '2-digit'
        });
        badge.textContent = `Last Updated: ${formattedTime}`;
    }
}

// 1. Cascading Org Structure Loading & Helpers
async function loadOrgStructure() {
    try {
        const res = await apiFetch("/api/org-structure");
        if (res && res.zones) {
            orgData = res;
        } else if (res && typeof res === 'object') {
            orgData = { zones: res };
        }

        const zoneSelect = document.getElementById("zoneFilter");
        if (zoneSelect && orgData.zones) {
            const zoneKeys = Object.keys(orgData.zones);
            zoneSelect.innerHTML = `<option value="">All Zones</option>` + 
                zoneKeys.map(z => `<option value="${z}">${z}</option>`).join("");
        }
    } catch (e) {
        console.warn("Failed to load org structure:", e);
    }
}

function onZoneChange() {
    const zoneVal = document.getElementById("zoneFilter")?.value || "";
    const regionSelect = document.getElementById("regionFilter");
    const divisionSelect = document.getElementById("divisionFilter");
    const cccSelect = document.getElementById("cccFilter");

    if (regionSelect) regionSelect.innerHTML = `<option value="">All Regions</option>`;
    if (divisionSelect) divisionSelect.innerHTML = `<option value="">All Divisions</option>`;
    if (cccSelect) cccSelect.innerHTML = `<option value="">All CCCs</option>`;

    if (!zoneVal || !orgData.zones[zoneVal]) return;

    // Regions can be under .regions or direct keys depending on org-structure format
    const zoneObj = orgData.zones[zoneVal];
    const regionsObj = zoneObj.regions || zoneObj;
    const regionKeys = Object.keys(regionsObj).filter(k => k !== 'divisions' && k !== 'cccs');

    if (regionSelect) {
        regionSelect.innerHTML += regionKeys.map(r => `<option value="${r}">${r}</option>`).join("");
    }
}

function onRegionChange() {
    const zoneVal = document.getElementById("zoneFilter")?.value || "";
    const regionVal = document.getElementById("regionFilter")?.value || "";
    const divisionSelect = document.getElementById("divisionFilter");
    const cccSelect = document.getElementById("cccFilter");

    if (divisionSelect) divisionSelect.innerHTML = `<option value="">All Divisions</option>`;
    if (cccSelect) cccSelect.innerHTML = `<option value="">All CCCs</option>`;

    if (!zoneVal || !regionVal) return;

    const zoneObj = orgData.zones[zoneVal];
    const regionsObj = zoneObj.regions || zoneObj;
    const regionObj = regionsObj[regionVal];

    if (!regionObj) return;

    // Divisions can be under .divisions or direct keys
    const divisionsObj = regionObj.divisions || regionObj;
    const divisionKeys = Object.keys(divisionsObj).filter(k => k !== 'cccs' && k !== 'Sub-stations');

    if (divisionSelect) {
        divisionSelect.innerHTML += divisionKeys.map(d => `<option value="${d}">${d}</option>`).join("");
    }
}

function onDivisionChange() {
    const zoneVal = document.getElementById("zoneFilter")?.value || "";
    const regionVal = document.getElementById("regionFilter")?.value || "";
    const divisionVal = document.getElementById("divisionFilter")?.value || "";
    const cccSelect = document.getElementById("cccFilter");

    if (cccSelect) cccSelect.innerHTML = `<option value="">All CCCs</option>`;

    if (!zoneVal || !regionVal || !divisionVal) return;

    const zoneObj = orgData.zones[zoneVal];
    const regionsObj = zoneObj.regions || zoneObj;
    const regionObj = regionsObj[regionVal];
    const divisionsObj = regionObj.divisions || regionObj;
    const divisionObj = divisionsObj[divisionVal];

    if (!divisionObj) return;

    // CCCs can be under .cccs, .CCCs, .sub_stations, or direct array/object
    let cccsList = divisionObj.cccs || divisionObj.CCCs || divisionObj.sub_stations || divisionObj["Sub-stations"] || [];
    if (!Array.isArray(cccsList) && typeof divisionObj === 'object') {
        cccsList = Object.keys(divisionObj).filter(k => k !== 'divisions' && k !== 'cccs');
    }

    if (cccSelect && Array.isArray(cccsList)) {
        cccSelect.innerHTML += cccsList.map(c => `<option value="${c}">${c}</option>`).join("");
    }
}

// 2. Data Fetching & KPI Update
async function loadDashboardData() {
    const month = document.getElementById("dateFilter")?.value || "";
    const zone = document.getElementById("zoneFilter")?.value || "";
    const region = document.getElementById("regionFilter")?.value || "";
    const division = document.getElementById("divisionFilter")?.value || "";
    const ccc = document.getElementById("cccFilter")?.value || "";

    const params = new URLSearchParams();
    if (month) params.append("month", month);
    if (zone) params.append("zone", zone);
    if (region) params.append("region", region);
    if (division) params.append("division", division);
    if (ccc) params.append("ccc", ccc);

    try {
        const data = await apiFetch(`/api/blocks/revenue_work/dashboard-summary?${params.toString()}`);
        const totals = data.totals || {};
        const regionsBreakdown = data.regions_breakdown || [];

        // Update KPI Cards with real data (handling 0 / null safely)
        document.getElementById("kpi-total-count").textContent = (totals.total_count || 0).toLocaleString();
        document.getElementById("kpi-total-amount").textContent = `?${(totals.total_amount_cr || 0).toFixed(2)} Cr`;

        document.getElementById("kpi-fully-paid-count").textContent = (totals.fully_paid_count || 0).toLocaleString();
        document.getElementById("kpi-fully-paid-amount").textContent = `?${(totals.fully_paid_amount_lakh || 0).toFixed(2)} Lakh`;

        document.getElementById("kpi-part-paid-count").textContent = (totals.part_paid_count || 0).toLocaleString();
        document.getElementById("kpi-part-paid-amount").textContent = `?${(totals.part_paid_amount_lakh || 0).toFixed(2)} Lakh`;

        document.getElementById("kpi-disconnected-count").textContent = (totals.disconnected_count || 0).toLocaleString();
        document.getElementById("kpi-disconnected-amount").textContent = `?${(totals.disconnected_amount_lakh || 0).toFixed(2)} Lakh`;

        document.getElementById("kpi-no-action-count").textContent = (totals.no_action_count || 0).toLocaleString();
        document.getElementById("kpi-no-action-amount").textContent = `?${(totals.no_action_amount_cr || 0).toFixed(2)} Cr`;

        document.getElementById("kpi-osd-3k-count").textContent = (totals.osd_gt_3k_count || 0).toLocaleString();
        document.getElementById("kpi-osd-3k-amount").textContent = `?${(totals.osd_gt_3k_amount_cr || 0).toFixed(2)} Cr`;

        document.getElementById("kpi-osd-5k-count").textContent = (totals.osd_gt_5k_count || 0).toLocaleString();
        document.getElementById("kpi-osd-5k-amount").textContent = `?${(totals.osd_gt_5k_amount_cr || 0).toFixed(2)} Cr`;

        // Render Charts
        renderCharts(totals, regionsBreakdown);

    } catch (e) {
        console.error("Failed to load dashboard summary:", e);
    }
}

function renderCharts(totals, regionsBreakdown) {
    const donutCtx = document.getElementById("donutChart").getContext("2d");
    if (donutChartInstance) donutChartInstance.destroy();

    donutChartInstance = new Chart(donutCtx, {
        type: 'doughnut',
        data: {
            labels: ['Fully Paid', 'Part Paid', 'Disconnected', 'No Action'],
            datasets: [{
                data: [
                    totals.fully_paid_count || 0,
                    totals.part_paid_count || 0,
                    totals.disconnected_count || 0,
                    totals.no_action_count || 0
                ],
                backgroundColor: ['#10b981', '#8b5cf6', '#f59e0b', '#ef4444'],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { font: { family: 'Inter', weight: '600', size: 12 }, padding: 15 } }
            },
            cutout: '68%'
        }
    });

    const barCtx = document.getElementById("barChart").getContext("2d");
    if (barChartInstance) barChartInstance.destroy();

    const labels = regionsBreakdown.map(r => r.region);
    const amounts = regionsBreakdown.map(r => r.total_amount_cr);

    barChartInstance = new Chart(barCtx, {
        type: 'bar',
        data: {
            labels: labels.length ? labels : ['No Data'],
            datasets: [{
                label: 'Revenue (? Cr)',
                data: amounts.length ? amounts : [0],
                backgroundColor: '#2563eb',
                borderRadius: 6,
                barThickness: 32
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { family: 'Inter', weight: '600' } } },
                x: { grid: { display: false }, ticks: { font: { family: 'Inter', weight: '600' } } }
            }
        }
    });
}

async function loadRawTable() {
    try {
        const res = await apiFetch("/api/blocks/revenue_work/");
        allEntries = res.items || res || [];
        renderTableRows(allEntries);
    } catch (e) {
        console.error("Failed to load raw table entries:", e);
    }
}

function renderTableRows(entries) {
    const tbody = document.getElementById("rawTableTbody");
    if (!tbody) return;

    if (!entries.length) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#64748b; padding:20px;">No records found.</td></tr>`;
        return;
    }

    tbody.innerHTML = entries.map(item => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 12px; font-weight: 600;">${escapeHtml(item.zone || "—")}</td>
            <td style="padding: 12px; font-weight: 600;">${escapeHtml(item.region || "—")}</td>
            <td style="padding: 12px; font-weight: 600;">${escapeHtml(item.division || "—")}</td>
            <td style="padding: 12px; font-weight: 600;">${(item.total_count || 0).toLocaleString()}</td>
            <td style="padding: 12px; color:#10b981; font-weight:700;">${(item.fully_paid_count || 0).toLocaleString()}</td>
            <td style="padding: 12px; color:#8b5cf6; font-weight:700;">${(item.part_paid_count || 0).toLocaleString()}</td>
            <td style="padding: 12px; font-weight:700;">?${(item.total_amount_cr || 0).toFixed(2)} Cr</td>
        </tr>
    `).join("");
}

function switchTab(tabName) {
    const buttons = document.querySelectorAll(".tab-btn");
    buttons.forEach(btn => {
        btn.classList.remove("active");
        if (btn.textContent.toLowerCase().includes(tabName)) {
            btn.classList.add("active");
        }
    });

    let chartsSec = document.getElementById("chartsSection");
    let tablesSec = document.getElementById("tablesSection");
    let followupsSec = document.getElementById("followupsSection");

    if (!tablesSec) {
        tablesSec = document.createElement("div");
        tablesSec.id = "tablesSection";
        tablesSec.style.display = "none";
        tablesSec.innerHTML = `
            <div style="background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
                    <h3 style="font-size: 16px; font-weight: 800; margin: 0; color: #0f172a;">Raw Revenue Data Table</h3>
                    <input type="text" id="tableSearch" placeholder="Search division or zone..." class="date-filter" oninput="filterTable()" style="max-width: 250px;">
                </div>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                        <thead>
                            <tr style="border-bottom: 2px solid #e2e8f0; color: #64748b;">
                                <th style="padding: 12px;">Zone</th>
                                <th style="padding: 12px;">Region</th>
                                <th style="padding: 12px;">Division</th>
                                <th style="padding: 12px;">Total Consumers</th>
                                <th style="padding: 12px;">Fully Paid</th>
                                <th style="padding: 12px;">Part Paid</th>
                                <th style="padding: 12px;">Total Amount</th>
                            </tr>
                        </thead>
                        <tbody id="rawTableTbody">
                            <tr><td colspan="7" style="text-align:center; padding:20px; color:#64748b;">Loading data...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        chartsSec.parentNode.insertBefore(tablesSec, chartsSec.nextSibling);
        renderTableRows(allEntries);
    }

    if (!followupsSec) {
        followupsSec = document.createElement("div");
        followupsSec.id = "followupsSection";
        followupsSec.style.display = "none";
        followupsSec.innerHTML = `
            <div style="background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);">
                <h3 style="font-size: 16px; font-weight: 800; margin: 0 0 16px 0; color: #0f172a;">Consumer Follow-up Actions</h3>
                <p style="color: #64748b; font-size: 14px; margin: 0 0 16px 0;">Track disconnection notices and OSD collection follow-ups across divisions.</p>
                <div style="padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; font-weight: 600; color: #334155;">
                    ?? Active follow-up lists are synchronized from MongoDB collections.
                </div>
            </div>
        `;
        tablesSec.parentNode.insertBefore(followupsSec, tablesSec.nextSibling);
    }

    if (chartsSec) chartsSec.style.display = 'none';
    if (tablesSec) tablesSec.style.display = 'none';
    if (followupsSec) followupsSec.style.display = 'none';

    if (tabName === 'charts' && chartsSec) {
        chartsSec.style.display = 'grid';
    } else if (tabName === 'tables' && tablesSec) {
        tablesSec.style.display = 'block';
    } else if (tabName === 'follow-ups' || tabName === 'followups') {
        if (followupsSec) followupsSec.style.display = 'block';
    }
}

function filterTable() {
    const q = document.getElementById("tableSearch")?.value.toLowerCase() || "";
    const filtered = allEntries.filter(item => 
        (item.division || "").toLowerCase().includes(q) || 
        (item.zone || "").toLowerCase().includes(q) ||
        (item.region || "").toLowerCase().includes(q)
    );
    renderTableRows(filtered);
}
