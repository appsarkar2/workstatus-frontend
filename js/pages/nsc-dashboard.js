// nsc-dashboard.js
let barChartInstance = null;
let allOrgData = {};
let fetchTimeout = null;
let currentTab = 'reg'; // Default tab

document.addEventListener("DOMContentLoaded", () => {
    console.log("🔥 NEW SCRIPT LOADED!");
    const user = getCurrentUser();
    const isSuperAdmin = user && user.username === "superadmin";
    const uploadBtn = document.getElementById('btnUploadCsv');
    if (uploadBtn && !isSuperAdmin) {
        uploadBtn.style.display = 'none'; // Hide for non-superadmins
    }
    loadOrgStructure();
    setupEventListeners();
});

async function loadOrgStructure() {
    try {
        const data = await apiFetch("/api/org-structure");
        allOrgData = data.zones || {}; 
        
        const zoneSelect = document.getElementById('filter_zone');
        if (zoneSelect) {
            zoneSelect.innerHTML = '<option value="">All Zones</option>';
            if (data.zones) {
                Object.keys(data.zones).forEach(zone => {
                    zoneSelect.innerHTML += `<option value="${zone}">${zone}</option>`;
                });
            }
        }

        const classData = await apiFetch("/api/blocks/nsc_monitoring/filter-options");
        const classSelect = document.getElementById("filter_conn_class");
        if (classSelect && classData && classData.classes) {
            classSelect.innerHTML = '<option value="">All Classes</option>';
            classData.classes.forEach(cls => {
                if(cls) classSelect.innerHTML += `<option value="${cls}">${cls}</option>`;
            });
        }

        const applicantTypeSelect = document.getElementById("filter_applicant_type");
        if (applicantTypeSelect && classData && classData.applicant_types) {
            applicantTypeSelect.innerHTML = '<option value="">All Applicants</option>';
            classData.applicant_types.forEach(at => {
                if(at) applicantTypeSelect.innerHTML += `<option value="${at}">${at}</option>`;
            });
        }

        fetchDashboardData();
    } catch (err) {
        console.error("Failed to load data", err);
    }
}

function setupEventListeners() {
    const zoneSelect = document.getElementById('filter_zone');
    const regSelect = document.getElementById('filter_reg');
    const divSelect = document.getElementById('filter_divn_name');
    const cccSelect = document.getElementById('filter_ccc_code');
    const classSelect = document.getElementById('filter_conn_class');
    const applicantTypeSelect = document.getElementById('filter_applicant_type');

    if (zoneSelect) {
        zoneSelect.addEventListener('change', (e) => {
            const zone = e.target.value;
            if(regSelect) regSelect.innerHTML = '<option value="">All Regions</option>';
            if(divSelect) divSelect.innerHTML = '<option value="">All Divisions</option>';
            if(cccSelect) cccSelect.innerHTML = '<option value="">All CCCs</option>';

            if (zone && allOrgData[zone] && regSelect) {
                Object.keys(allOrgData[zone].regions).forEach(reg => {
                    regSelect.innerHTML += `<option value="${reg}">${reg}</option>`;
                });
            }
            fetchDashboardData();
        });
    }

    if (regSelect) {
        regSelect.addEventListener('change', (e) => {
            const zone = zoneSelect ? zoneSelect.value : "";
            const reg = e.target.value;
            if(divSelect) divSelect.innerHTML = '<option value="">All Divisions</option>';
            if(cccSelect) cccSelect.innerHTML = '<option value="">All CCCs</option>';

            if (zone && reg && allOrgData[zone]?.regions[reg] && divSelect) {
                Object.keys(allOrgData[zone].regions[reg]).forEach(div => {
                    divSelect.innerHTML += `<option value="${div}">${div}</option>`;
                });
            }
            fetchDashboardData();
        });
    }

    if (divSelect) {
        divSelect.addEventListener('change', (e) => {
            const zone = zoneSelect ? zoneSelect.value : "";
            const reg = regSelect ? regSelect.value : "";
            const div = e.target.value;
            if(cccSelect) cccSelect.innerHTML = '<option value="">All CCCs</option>';

            if (zone && reg && div && allOrgData[zone]?.regions[reg]?.[div] && cccSelect) {
                const cccs = allOrgData[zone].regions[reg][div]["CCCs"] || [];
                cccs.forEach(ccc => {
                    cccSelect.innerHTML += `<option value="${ccc.code}">${ccc.name} (${ccc.code})</option>`;
                });
            }
            fetchDashboardData();
        });
    }

    if (classSelect) classSelect.addEventListener('change', fetchDashboardData);
    if (cccSelect) cccSelect.addEventListener('change', fetchDashboardData);
    if (applicantTypeSelect) applicantTypeSelect.addEventListener('change', fetchDashboardData);

    // CSV Upload
    const csvUploadInput = document.getElementById('csvUpload');
    if (csvUploadInput) {
        csvUploadInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const spinner = document.getElementById('uploadSpinner');
            if (spinner) spinner.style.display = 'block';

            try {
                const formData = new FormData();
                formData.append('file', file);
                const token = getToken();

                const res = await fetch(`${API_BASE}/api/blocks/nsc_monitoring/bulk-upload`, {
                    method: 'POST',
                    headers: { ...(token ? { "Authorization": `Bearer ${token}` } : {}) },
                    body: formData
                });

                if (res.ok) {
                    if (spinner) spinner.style.display = 'none';
                    showToast("✅ CSV Uploaded Successfully!", "success");
                    loadOrgStructure(); 
                } else {
                    if (spinner) spinner.style.display = 'none';
                    const errData = await res.json();
                    showToast("❌ Upload Failed: " + (errData.detail || "Unknown error"), "error");
                }
            } catch (err) {
                if (spinner) spinner.style.display = 'none';
                showToast("❌ Upload Failed: " + err.message, "error");
            } finally {
                csvUploadInput.value = "";
            }
        });
    }
}

// --- TAB SWITCH LOGIC ---
function switchTab(tabName) {
    currentTab = tabName;
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => btn.classList.remove('active-tab'));
    
    const clickedBtn = Array.from(buttons).find(b => b.getAttribute('onclick').includes(tabName));
    if(clickedBtn) clickedBtn.classList.add('active-tab');

    fetchDashboardData();
}

async function fetchDashboardData() {
    if (fetchTimeout) clearTimeout(fetchTimeout);

    const updateText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.innerText = value;
    };
    
    updateText("kpi-total", "...");

    fetchTimeout = setTimeout(async () => {
        const zone = document.getElementById("filter_zone")?.value || "";
        const reg = document.getElementById("filter_reg")?.value || "";
        const divn = document.getElementById("filter_divn_name")?.value || "";
        const ccc = document.getElementById("filter_ccc_code")?.value || ""; 
        const connClass = document.getElementById("filter_conn_class")?.value || "";
        const applicantType = document.getElementById("filter_applicant_type")?.value || "";

        const query = `?zone=${zone}&reg=${reg}&divn_name=${divn}&ccc_code=${ccc}&conn_class=${connClass}&applicant_type=${applicantType}&group_by=${currentTab}`;

        try {
            const data = await apiFetch(`/api/blocks/nsc_monitoring/kpi-dashboard${query}`);
            
            updateText("kpi-total", data.total_cases || 0);
            updateText("kpi-avg-delay", (data.avg_delay || 0).toFixed(2));
            updateText("kpi-qtndelay", (data.quotation_delay || 0).toFixed(2));
            updateText("kpi-wodelay", (data.wo_delay || 0).toFixed(2));
            updateText("kpi-pending-wo", data.pending_wo || 0);
            updateText("kpi-pending-app", data.pending_application || 0);

            renderAnalysisTable(data.region_data || [], currentTab);
            renderChartInDrawer(data.region_data || []);
        } catch (err) {
            console.error("Failed to fetch dashboard data", err);
            updateText("kpi-total", "0");
        }
    }, 300);
}

function renderAnalysisTable(data, tabName) {
    const head = document.getElementById('analysisHead');
    const body = document.getElementById('analysisBody');
    if (!head || !body) return;

    const headerNames = {
        'reg': 'Region',
        'divn_name': 'Division',
        'supp_off': 'CCC',
        'conn_class': 'Class'
    };

    head.innerHTML = `<tr><th>${headerNames[tabName] || 'Name'}</th><th>Count</th><th>Pending WO</th><th>Pending App</th><th>Pending %</th></tr>`;
    body.innerHTML = '';

    if (data.length === 0) {
        body.innerHTML = `<tr><td colspan="5" style="text-align:center;">No data found</td></tr>`;
        return;
    }

    const sortedData = [...data].sort((a, b) => b.count - a.count);

    const total = sortedData.reduce((sum, item) => sum + item.count, 0);
    const totalPending = sortedData.reduce((sum, item) => sum + (item.pending_count || 0), 0);

    sortedData.forEach(item => {
        let pct = 0;
        if (item.pending_count !== undefined && totalPending > 0) {
            pct = ((item.pending_count / totalPending) * 100).toFixed(1);
        } else {
            pct = total > 0 ? ((item.count / total) * 100).toFixed(1) : 0;
        }

        body.innerHTML += `
            <tr>
                <td>${item._id || 'Unknown'}</td>
                <td>${item.count}</td>
                <td>${item.pending_wo || 0}</td>
                <td>${item.pending_application || 0}</td>
                <td>${pct}%</td>
            </tr>
        `;
    });
}

// Drawer Logic
function openDrawer() {
    document.getElementById('drawerOverlay').classList.add('show');
    document.getElementById('drawer').classList.add('show');
}

function closeDrawer() {
    document.getElementById('drawerOverlay').classList.remove('show');
    document.getElementById('drawer').classList.remove('show');
}

// KPI Details Drawer Logic
async function openDetailsDrawer(statusType) {
    const overlay = document.getElementById('detailsDrawerOverlay');
    const drawer = document.getElementById('detailsDrawer');
    const titleEl = document.getElementById('drawerTitle');
    const tbody = document.getElementById('detailsDrawerBody');

    if (!overlay || !drawer || !tbody) return;

    const titles = {
        'pending_conn': 'Pending Connection Applications',
        'avg_delay': 'All Open Cases (Avg Delay)',
        'quotation_delay': 'Quotation Delay Applications',
        'wo_delay': 'Work Order Delay Applications',
        'pending_wo': 'Pending Work Order Applications'
    };

    if (titleEl) titleEl.textContent = titles[statusType] || 'Application Details';
    
    // CHANGE COLSPAN TO 6
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">Loading applications...</td></tr>';

    overlay.classList.add('show');
    drawer.classList.add('show');

    const zone = document.getElementById('filter_zone')?.value || '';
    const reg = document.getElementById('filter_reg')?.value || '';
    const divn_name = document.getElementById('filter_divn_name')?.value || '';
    const ccc_code = document.getElementById('filter_ccc_code')?.value || '';
    const conn_class = document.getElementById('filter_conn_class')?.value || '';
    const applicant_type = document.getElementById('filter_applicant_type')?.value || '';

    const query = `?status_type=${encodeURIComponent(statusType)}&zone=${encodeURIComponent(zone)}&reg=${encodeURIComponent(reg)}&divn_name=${encodeURIComponent(divn_name)}&ccc_code=${encodeURIComponent(ccc_code)}&conn_class=${encodeURIComponent(conn_class)}&applicant_type=${encodeURIComponent(applicant_type)}`;

    try {
        const res = await apiFetch(`/api/blocks/nsc_monitoring/pending-details${query}`);
        const items = res.items || [];

        tbody.innerHTML = '';
        if (items.length === 0) {
            // CHANGE COLSPAN TO 6
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px; color: #64748b;">No applications found</td></tr>';
            return;
        }

        items.forEach(item => {
            const woColor = item.wo_status === "Issued" ? "#10b981" : "#ef4444";
            tbody.innerHTML += `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#f8fafc'" onmouseout="this.style.backgroundColor='transparent'">
                    <td style="padding: 12px 16px; font-weight: 600; color: #2563eb;">${item.appl_no || '-'}</td>
                    <td style="padding: 12px 16px; color: #0f172a;">${item.name || '-'}</td>
                    <td style="padding: 12px 16px; color: #475569;">${item.ccc || '-'}</td>
                    <td style="padding: 12px 16px; color: #475569;">${item.agency_name || '-'}</td>
                    <td style="padding: 12px 16px; font-weight: 600; color: ${woColor};">${item.wo_status || '-'}</td>
                    <td style="padding: 12px 16px; font-weight: 600; color: ${item.delay_as_on_today > 30 ? '#dc2626' : '#0f172a'};">${item.delay_as_on_today || 0}</td>
                </tr>
            `;
        });
    } catch (err) {
        console.error("Failed to load application details", err);
        // CHANGE COLSPAN TO 6
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px; color: #dc2626;">Failed to load application details</td></tr>';
    }
}

function closeDetailsDrawer() {
    const overlay = document.getElementById('detailsDrawerOverlay');
    const drawer = document.getElementById('detailsDrawer');
    if (overlay) overlay.classList.remove('show');
    if (drawer) drawer.classList.remove('show');
}

// Drawer Chart Logic (Restored)
function renderChartInDrawer(regionData) {
    const drawerBody = document.getElementById('drawerBody');
    if (!drawerBody) return;

    let tableHTML = `<table style="width:100%; border-collapse: collapse;">
        <tr><th>Name</th><th>Count</th></tr>`;

    regionData.forEach(r => {
        tableHTML += `<tr><td>${r._id}</td><td>${r.count}</td></tr>`;
    });
    tableHTML += `</table>`;
    
    if(drawerBody) {
       drawerBody.innerHTML = tableHTML;
    }
}