// frontend/js/pages/interruption-dashboard.js
let allOrgData = {};
let allFeedersData = [];

document.addEventListener("DOMContentLoaded", () => {
    console.log("⚡ Interruption Dashboard Initialized");
    
    const user = getCurrentUser();
    const isSuperAdmin = user && user.username === "superadmin";
    const uploadBtn = document.getElementById('btnUploadCsv');
    if (uploadBtn && !isSuperAdmin) {
        uploadBtn.style.display = 'none';
    }

    loadOrgStructure();
    setupEventListeners();
    setupCsvUpload();
});

// 1. Load Org Structure & Filter Options
async function loadOrgStructure() {
    try {
        const data = await apiFetch("/api/org-structure");
        allOrgData = data.zones || {}; 
        
        // Populate Zones
        const zoneSelect = document.getElementById('filter_zone');
        if (zoneSelect) {
            zoneSelect.innerHTML = '<option value="">All Zones</option>';
            Object.keys(allOrgData).forEach(zone => {
                zoneSelect.innerHTML += `<option value="${zone}">${zone}</option>`;
            });
        }

        // Populate Substations from CSV data
        const filterOptions = await apiFetch("/api/blocks/interruption_report/filter-options");
        const substationSelect = document.getElementById("filter_substation");
        if (substationSelect && filterOptions && filterOptions.substations) {
            substationSelect.innerHTML = '<option value="">All Substations</option>';
            filterOptions.substations.forEach(sub => {
                if (sub && sub.trim() !== "") {
                    substationSelect.innerHTML += `<option value="${sub}">${sub}</option>`;
                }
            });
        }

        fetchDashboardData();
    } catch (err) {
        console.error("Failed to load org structure / filter options", err);
    }
}

// 2. Setup Event Listeners (Cascading Dropdowns)
function setupEventListeners() {
    const zoneSelect = document.getElementById('filter_zone');
    const regSelect = document.getElementById('filter_reg');
    const divSelect = document.getElementById('filter_divn_name');
    const substationSelect = document.getElementById('filter_substation');

    // ZONE -> REGION
    if (zoneSelect) {
        zoneSelect.addEventListener('change', (e) => {
            const zone = e.target.value;
            if (regSelect) regSelect.innerHTML = '<option value="">All Regions</option>';
            if (divSelect) divSelect.innerHTML = '<option value="">All Divisions</option>';

            if (zone && allOrgData[zone] && regSelect) {
                const regionsObj = allOrgData[zone].regions || allOrgData[zone];
                Object.keys(regionsObj).forEach(reg => {
                    regSelect.innerHTML += `<option value="${reg}">${reg}</option>`;
                });
            }
            fetchDashboardData();
        });
    }

    // REGION -> DIVISION
    if (regSelect) {
        regSelect.addEventListener('change', (e) => {
            const zone = zoneSelect ? zoneSelect.value : "";
            const reg = e.target.value;
            if (divSelect) divSelect.innerHTML = '<option value="">All Divisions</option>';

            if (zone && reg && allOrgData[zone]) {
                const regionsObj = allOrgData[zone].regions || allOrgData[zone];
                if (regionsObj[reg]) {
                    Object.keys(regionsObj[reg]).forEach(div => {
                        divSelect.innerHTML += `<option value="${div}">${div}</option>`;
                    });
                }
            }
            fetchDashboardData();
        });
    }

    // DIVISION & SUBSTATION CHANGES
    if (divSelect) {
        divSelect.addEventListener('change', () => fetchDashboardData());
    }
    if (substationSelect) {
        substationSelect.addEventListener('change', () => fetchDashboardData());
    }
}

// 3. Fetch Dashboard Data
async function fetchDashboardData() {
    const zone = document.getElementById('filter_zone')?.value || '';
    const reg = document.getElementById('filter_reg')?.value || '';
    const division = document.getElementById('filter_divn_name')?.value || '';
    const substation = document.getElementById('filter_substation')?.value || '';

    const query = `?zone=${encodeURIComponent(zone)}&region=${encodeURIComponent(reg)}&division=${encodeURIComponent(division)}&substation=${encodeURIComponent(substation)}`;

    try {
        const data = await apiFetch(`/api/blocks/interruption_report/dashboard${query}`);
        
        // Update KPI Cards
        document.getElementById('kpi-total-feeders').textContent = data.total_feeders ?? 0;
        document.getElementById('kpi-avg-daily').textContent = (data.avg_daily_outage ?? 0).toFixed(2);
        document.getElementById('kpi-monthly-range').textContent = data.monthly_range ?? '0 - 0';
        document.getElementById('kpi-avg-yearly').textContent = (data.avg_yearly ?? 0).toFixed(2);
        document.getElementById('kpi-concern-feeders').textContent = data.concern_feeders ?? 0;

        // Update Table
        allFeedersData = data.feeders || [];
        const tbody = document.getElementById('feederTableBody');
        if (tbody) {
            tbody.innerHTML = '';
            if (allFeedersData.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 30px; color: #64748b;">No feeder records found. Please upload a CSV.</td></tr>';
            } else {
                allFeedersData.forEach(f => {
                    tbody.innerHTML += `
                        <tr>
                            <td style="font-weight: 600; color: #2563eb;">${f.feeder_name || '-'}</td>
                            <td>${f.substation || '-'}</td>
                            <td style="font-weight: 600;">${f.daily_outage ?? 0}</td>
                            <td>${f.monthly_outage ?? 0}</td>
                            <td><span style="padding: 4px 8px; border-radius: 6px; font-weight: 600; background: ${f.trips > 5 ? '#fee2e2' : '#f1f5f9'}; color: ${f.trips > 5 ? '#dc2626' : '#0f172a'};">${f.trips ?? 0}</span></td>
                        </tr>
                    `;
                });
            }
        }
    } catch (err) {
        console.error("Failed to fetch dashboard data", err);
    }
}

// 4. Setup CSV Upload (Superadmin only)
function setupCsvUpload() {
    const csvInput = document.getElementById('csvUpload');
    if (!csvInput) return;

    csvInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        try {
            const token = getToken();
            const res = await fetch(`${API_BASE}/api/blocks/interruption_report/bulk-upload`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` },
                body: formData
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Upload failed");

            showToast(`Successfully uploaded ${data.count} interruption records!`, "success");
            csvInput.value = "";
            await loadOrgStructure(); // Refresh substations dropdown
            await fetchDashboardData();
        } catch (err) {
            showToast("Error uploading CSV: " + err.message, "error");
        }
    });
}