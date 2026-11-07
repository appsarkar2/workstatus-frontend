/**
 * application-detail.js
 * Core logic for rendering the Application Dashboard, Stepper, and Drawers.
 */

const params = new URLSearchParams(window.location.search);
const blockId = params.get("block") || "bulk_connection";
const appId = params.get("id");

if (!appId) window.location.href = "/dashboard.html";

const blockApi = BlockAPI(blockId);
const appContainer = document.getElementById("app");

let currentApp = null;
let orgData = {};
let currentUser = getCurrentUser();
let isSuperAdmin = ["super_admin", "admin"].includes(currentUser.role);
let activeStageNo = null;

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function calculateSla(stage) {
    if (stage.status !== 'completed' || !stage.actual_date || !stage.target_date) return null;
    const actual = new Date(stage.actual_date);
    const target = new Date(stage.target_date);
    const diffDays = Math.ceil((actual - target) / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) return { days: diffDays, type: 'late' };
    if (diffDays < 0) return { days: Math.abs(diffDays), type: 'early' };
    return { days: 0, type: 'ontime' };
}

// Calculates exactly N working days ahead (skipping Sundays)
function addWorkingDays(startDateStr, days) {
    if (!startDateStr) return "";
    let date = new Date(startDateStr);
    let count = 0;
    while (count < days) {
        date.setDate(date.getDate() + 1);
        if (date.getDay() !== 0) { // 0 = Sunday
            count++;
        }
    }
    return date.toISOString().split('T')[0];
}

// ==========================================
// INITIALIZATION
// ==========================================

async function loadData() {
    try {
        const [appData, orgStructure] = await Promise.all([
            blockApi.getOne(appId),
            apiFetch("/api/org-structure")
        ]);
        currentApp = appData;
        orgData = orgStructure;
        renderDashboard();
    } catch (e) {
        appContainer.innerHTML = `<div style="text-align: center; padding: 50px; color: red;">Error: ${e.message}</div>`;
    }
}

// ==========================================
// MAIN RENDERING
// ==========================================

function renderDashboard() {
    const e = currentApp;
    const stages = e.stages || [];
    
    // DB-driven RBAC fallback if not using DB (kept for legacy support)
    const ALLOWED_MAP = {
        "hr_user": [1], "dro_h&r": [1], "commerce_manager_1": [2, 3], "commerce_manager_2": [5, 6, 7, 8],
        "finance_user": [4], "dro_finance": [4], "commerce_manager_3": [9, 10, 11, 12, 13]
    };
    const uname = (currentUser.username || "").toLowerCase();
    const allowedStages = ALLOWED_MAP[uname] || currentUser.allowed_stages || [];

    let stageRows = stages.map((s) => {
        const sla = calculateSla(s);
        let statusBadge = '';
        let rowStyle = '';

        if (s.status === 'completed') {
            if (sla && sla.type === 'late') {
                statusBadge = `<span class="badge badge-red">❌ Late by ${sla.days} Days</span>`;
                rowStyle = "background-color: #fef2f2;";
            } else if (sla && sla.type === 'early') {
                statusBadge = `<span class="badge badge-green">✅ Early by ${sla.days} Days</span>`;
                rowStyle = "background-color: #f0fdf4;";
            } else {
                statusBadge = `<span class="badge badge-green">✅ On Time</span>`;
            }
        } else if (s.status === 'in_progress') {
            const now = new Date();
            const target = new Date(s.target_date);
            if (now > target) {
                statusBadge = `<span class="badge badge-red-pulse">⚠️ In Progress (Breached)</span>`;
                rowStyle = "background-color: #fffbeb;";
            } else {
                statusBadge = `<span class="badge badge-blue">🔄 In Progress</span>`;
            }
        } else {
            statusBadge = `<span class="badge badge-gray">⏳ Pending</span>`;
        }

        const canEdit = isSuperAdmin || allowedStages.includes(s.stage_no);
        let actionBtn = "";
        
        if (s.status === "in_progress" && canEdit) {
            actionBtn = `<button class="step-action-btn" onclick="openDrawer(${s.stage_no}, '${escapeHtml(s.name)}', '${s.status}')">Update</button>`;
        } else if (s.status === "completed" && isSuperAdmin) {
            actionBtn = `<button class="step-action-btn" style="background:var(--warning); color:white;" onclick="openDrawer(${s.stage_no}, '${escapeHtml(s.name)}', '${s.status}')">Manage</button>`;
        } else if (s.status === "in_progress") {
            actionBtn = `<button class="step-action-btn locked" disabled>🔒 Locked</button>`;
        }

        const compDate = s.actual_date ? formatDate(s.actual_date) : '—';
        const targetDate = s.target_date ? formatDate(s.target_date) : '—';
        const compBy = s.completed_by || '—';

        return `
            <tr style="${rowStyle}">
                <td style="font-weight: 800; color: #64748b;">#${s.stage_no}</td>
                <td>
                    <div style="font-weight: 700; color: #0f172a;">${s.name}</div>
                    <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Dept: ${s.dept || 'General'}</div>
                </td>
                <td>${statusBadge}</td>
                <td><div style="font-weight: 600;">${compBy}</div><div style="font-size: 11px; color: #64748b;">${compDate}</div></td>
                <td><div style="font-size: 12px; color: #64748b;">Target: ${targetDate}</div></td>
                <td style="text-align: right;">${actionBtn}</td>
            </tr>
        `;
    }).join('');

    appContainer.innerHTML = `
        <div class="app-container">
            <div class="page-header">
                <div class="page-title">
                    <h1>${e.application_no}</h1>
                    <p>${e.applicant ? e.applicant.name : "Unknown Applicant"}</p>
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    ${isSuperAdmin || currentUser.role === 'commerce_manager' ? `<button class="btn-primary" onclick="openEditModal()">Edit Details</button>` : ''}
                    <a href="/block-detail.html?block=${blockId}" class="btn-back">← Back to List</a>
                </div>
            </div>

            <div class="top-ribbon">
                <div class="ribbon-item">
                    <div class="ribbon-icon">📍</div>
                    <div class="ribbon-text">
                        <div class="val">${e.division || "N/A"} ${e.substation ? `<br><span style="font-size:12px; color:var(--text-muted);">${e.substation}</span>` : ""}</div>
                        <div class="lbl">Division / Sub-station</div>
                    </div>
                </div>
                <div class="ribbon-item">
                    <div class="ribbon-icon">📅</div>
                    <div class="ribbon-text">
                        <div class="val">${e.application_date || "—"}</div>
                        <div class="lbl">Start Date</div>
                    </div>
                </div>
                <div class="ribbon-item">
                    <div class="ribbon-icon">👤</div>
                    <div class="ribbon-text">
                        <div class="val">${e.assigned_to || "Unassigned"}</div>
                        <div class="lbl">Assigned To</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <h3 style="font-size: 20px; font-weight: 800; margin-top: 0; margin-bottom: 24px;">Application Details</h3>
                <div class="data-grid">
                    <div class="data-group full"><div class="data-label">Applicant Name</div><div class="data-value large">${e.applicant ? e.applicant.name : "—"}</div></div>
                    <div class="data-group full"><div class="data-label">Address</div><div class="data-value">${e.applicant ? (e.applicant.address || "—") : "—"}</div></div>
                </div>
                <div class="divider"></div>
                <div class="data-grid">
                    <div class="data-group"><div class="data-label">Contact</div><div class="data-value">${e.applicant ? (e.applicant.contact || "—") : "—"}</div></div>
                    <div class="data-group"><div class="data-label">Voltage Class</div><div class="data-value">${e.applicant ? (e.applicant.type || "—") : "—"}</div></div>
                    <div class="data-group"><div class="data-label">Connection Type</div><div class="data-value">${e.connection_type || "—"}</div></div>
                    <div class="data-group full">
                        <div class="data-label">Proposed Demand (1st - 5th Yr)</div>
                        <div class="data-value">${e.proposed_demand_1st || "—"} / ${e.proposed_demand_2nd || "—"} / ${e.proposed_demand_3rd || "—"} / ${e.proposed_demand_4th || "—"} / ${e.proposed_demand_5th || "—"} KVA</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <h3 style="font-size: 20px; font-weight: 800; margin: 0 0 10px 0;">Workflow & SLA Tracker</h3>
                <div style="overflow-x: auto;">
                    <table class="workflow-table">
                        <thead>
                            <tr>
                                <th style="width: 60px;">Stage</th>
                                <th>Workflow Step</th>
                                <th>SLA Status</th>
                                <th>Completed By</th>
                                <th>Dates</th>
                                <th style="text-align: right;">Action</th>
                            </tr>
                        </thead>
                        <tbody>${stageRows}</tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// ==========================================
// DRAWER LOGIC
// ==========================================

function openDrawer(stageNo, stageName, status) {
    activeStageNo = stageNo;
    document.getElementById('drawerTitle').innerText = `${stageNo}. ${stageName}`;
    
    const drawerBadge = document.getElementById('drawerBadge');
    if (status === 'completed') {
        drawerBadge.innerText = "COMPLETED (MANAGE)";
        drawerBadge.style.background = "#dcfce7"; drawerBadge.style.color = "#166534";
    } else {
        drawerBadge.innerText = "IN PROGRESS";
        drawerBadge.style.background = "#eff6ff"; drawerBadge.style.color = "#1d4ed8";
    }

    const drawerBody = document.getElementById('drawerFormBody');
    const submitBtn = document.getElementById('submitStageBtn');
    const reverseBtn = document.getElementById('reverseStageBtn');
    
    submitBtn.innerHTML = "✅ Mark Stage Complete";
    submitBtn.style.background = "var(--success)";
    submitBtn.style.boxShadow = "0 4px 12px rgba(16,185,129,0.3)";

    // Show reverse button ONLY for Super Admin on a COMPLETED stage
    if (isSuperAdmin && status === 'completed') {
        reverseBtn.style.display = "block";
    } else {
        reverseBtn.style.display = "none";
    }

    let formHtml = "";
    const existingStage = currentApp.stages.find(s => s.stage_no === stageNo) || {};

    if (stageNo === 1) {
        formHtml = `<div class="input-group"><label>Document Verification Remarks</label><textarea id="stageRemarks" class="input-field" rows="3">${existingStage.remarks || ''}</textarea></div>`;
    } 
    else if (stageNo === 2) {
        formHtml = `
            <div class="input-group">
                <label>E-Office Note Ref No *</label>
                <input type="text" id="eOfficeNo" class="input-field" value="${existingStage.ref_no || ''}" required />
            </div>
            <div class="input-group">
                <label>E-Office Date *</label>
                <input type="date" id="eOfficeDate" class="input-field" value="${existingStage.eoffice_date || ''}" onchange="handleEofficeDateChange(this.value)" required />
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 6px;">Inspection must be received within 7 working days.</div>
            </div>
            <div class="input-group">
                <label>Inspection Report Received as on *</label>
                <input type="date" id="inspectionDate" class="input-field" value="${existingStage.inspection_date || ''}" onchange="toggleFeasibility()" required />
                <div id="inspectionError" style="font-size: 11px; color: var(--danger); margin-top: 6px; display: none;">Date exceeds 7 working days!</div>
            </div>
            <div class="input-group">
                <label>Technically Feasible? *</label>
                <select id="isFeasible" class="input-field" onchange="toggleFeasibility()" disabled>
                    <option value="pending">⏳ Pending (Waiting for Inspection)</option>
                    <option value="true" ${existingStage.is_feasible === true ? 'selected' : ''}>✅ Yes, Feasible</option>
                    <option value="false" ${existingStage.is_feasible === false ? 'selected' : ''}>❌ No, Not Feasible</option>
                </select>
            </div>
            <div class="input-group"><label>Remarks</label><input type="text" id="stageRemarks" class="input-field" value="${existingStage.remarks || ''}" /></div>
        `;
    }
    else if (stageNo === 3) {
        formHtml = `
            <div class="input-group"><label>Quotation Amount (₹) *</label><input type="number" id="quotationAmount" class="input-field" value="${existingStage.quotation_amount || ''}" required /></div>
            <div class="input-group"><label>Quotation Served Date *</label><input type="date" id="quotationDate" class="input-field" value="${existingStage.actual_date || ''}" required /></div>
        `;
    }
    else if (stageNo === 4) {
        formHtml = `
            <div class="input-group"><label>Amount Deposited (₹) *</label><input type="number" id="depositAmount" class="input-field" value="${existingStage.deposit_amount || ''}" required /></div>
            <div class="input-group"><label>Deposit Date *</label><input type="date" id="depositDate" class="input-field" value="${existingStage.actual_date || ''}" required /></div>
        `;
    }
    else {
        formHtml = `<div class="input-group"><label>Remarks</label><input type="text" id="stageRemarks" class="input-field" value="${existingStage.remarks || ''}" /></div>`;
    }

    drawerBody.innerHTML = formHtml;

    // Trigger validations on load for Stage 2
    if (stageNo === 2 && existingStage.eoffice_date) {
        handleEofficeDateChange(existingStage.eoffice_date, existingStage.inspection_date);
    }

    document.getElementById('drawerOverlay').classList.add('show');
}

// --- STAGE 2 CUSTOM LOGIC ---
function handleEofficeDateChange(eofficeDate, existingInspectionDate = null) {
    const inspInput = document.getElementById('inspectionDate');
    if (!inspInput) return;

    if (!eofficeDate) {
        inspInput.value = "";
        inspInput.removeAttribute('min');
        inspInput.removeAttribute('max');
        toggleFeasibility();
        return;
    }

    // 1. Min date is the E-Office Date
    inspInput.min = eofficeDate;
    
    // 2. Max date is E-Office Date + 7 Working Days
    const maxDate = addWorkingDays(eofficeDate, 7);
    inspInput.max = maxDate;

    if (existingInspectionDate) inspInput.value = existingInspectionDate;
    toggleFeasibility();
}

function toggleFeasibility() {
    const inspDate = document.getElementById('inspectionDate')?.value;
    const selectFeasible = document.getElementById('isFeasible');
    const submitBtn = document.getElementById('submitStageBtn');
    const errorMsg = document.getElementById('inspectionError');
    
    if (!inspDate) {
        selectFeasible.value = "pending";
        selectFeasible.disabled = true;
        submitBtn.innerHTML = "✅ Mark Stage Complete";
        submitBtn.style.background = "var(--success)";
        return;
    }

    // Check if outside bounds
    const minDate = document.getElementById('inspectionDate').min;
    const maxDate = document.getElementById('inspectionDate').max;
    if (inspDate < minDate || inspDate > maxDate) {
        errorMsg.style.display = 'block';
        selectFeasible.disabled = true;
        selectFeasible.value = "pending";
    } else {
        errorMsg.style.display = 'none';
        selectFeasible.disabled = false;
    }

    const val = selectFeasible.value;
    if (val === "false") {
        submitBtn.innerHTML = "❌ Mark Not Feasible (Reject)";
        submitBtn.style.background = "var(--danger)";
        submitBtn.style.boxShadow = "0 4px 12px rgba(239,68,68,0.3)";
    } else {
        submitBtn.innerHTML = "✅ Mark Stage Complete";
        submitBtn.style.background = "var(--success)";
        submitBtn.style.boxShadow = "0 4px 12px rgba(16,185,129,0.3)";
    }
}

function closeDrawer() { 
    document.getElementById('drawerOverlay').classList.remove('show'); 
}

// ==========================================
// ACTIONS
// ==========================================

async function markComplete() {
    const payload = { stage_no: activeStageNo, status: "completed" };

    if (activeStageNo === 2) {
        const inspDate = document.getElementById("inspectionDate").value;
        const maxDate = document.getElementById("inspectionDate").max;
        
        if (!inspDate) return showToast("Please enter Inspection Date", "error");
        if (inspDate > maxDate) return showToast("Inspection date exceeds 7 working days!", "error");
        
        payload.ref_no = document.getElementById("eOfficeNo").value;
        payload.eoffice_date = document.getElementById("eOfficeDate").value;
        payload.inspection_date = inspDate;
        payload.is_feasible = document.getElementById("isFeasible").value === "true";
        payload.remarks = document.getElementById("stageRemarks").value;
        
        if (!payload.ref_no || !payload.eoffice_date) return showToast("Please fill all required fields", "error");
    } 
    else if (activeStageNo === 3) {
        payload.quotation_amount = document.getElementById("quotationAmount").value;
        payload.actual_date = document.getElementById("quotationDate").value;
        if (!payload.quotation_amount || !payload.actual_date) return showToast("Please fill Quotation Amount and Date", "error");
    }
    else if (activeStageNo === 4) {
        payload.deposit_amount = document.getElementById("depositAmount").value;
        payload.actual_date = document.getElementById("depositDate").value;
        if (!payload.deposit_amount || !payload.actual_date) return showToast("Please fill Deposit Amount and Date", "error");
    }
    else {
        payload.remarks = document.getElementById("stageRemarks")?.value || "";
    }

    try {
        await blockApi.updateStage(appId, payload);
        showToast("Stage completed ✅", "success");
        closeDrawer();
        loadData();
    } catch (e) {
        showToast(e.message, "error");
    }
}

async function reverseStage() {
    if(!confirm("Are you sure you want to reverse this stage? This will set the stage back to 'In Progress' and reset all downstream stages.")) return;
    
    try {
        // Send an 'in_progress' status update to trigger the backend reversal
        const payload = { stage_no: activeStageNo, status: "in_progress" };
        await blockApi.updateStage(appId, payload);
        showToast("Stage reversed successfully ↩️", "success");
        closeDrawer();
        loadData();
    } catch (e) {
        showToast(e.message, "error");
    }
}

// ==========================================
// EDIT MODAL & CASCADING LOGIC
// ==========================================

function openEditModal() {
    const zoneSelect = document.getElementById("editZone");
    zoneSelect.innerHTML = `<option value="" disabled selected>Select Zone...</option>`;
    Object.keys(orgData.zones).forEach(z => {
        zoneSelect.innerHTML += `<option value="${z}">${z}</option>`;
    });

    if (currentApp.division) {
        for (const z in orgData.zones) {
            for (const r in orgData.zones[z].regions) {
                if (orgData.zones[z].regions[r][currentApp.division]) {
                    document.getElementById("editZone").value = z;
                    updateRegions();
                    document.getElementById("editRegion").value = r;
                    updateDivisions();
                    document.getElementById("editDivision").value = currentApp.division;
                    updateSubStations();
                    if (currentApp.substation) document.getElementById("editSubstation").value = currentApp.substation;
                    break;
                }
            }
        }
    }

    document.getElementById("editVoltageClass").value = currentApp.applicant?.type || "LT";
    document.getElementById("editConnectionType").value = currentApp.connection_type || "Procedure-A";
    document.getElementById("editAddress").value = currentApp.applicant?.address || "";
    
    document.getElementById("editDemand1st").value = currentApp.proposed_demand_1st || "";
    document.getElementById("editDemand2nd").value = currentApp.proposed_demand_2nd || "";
    document.getElementById("editDemand3rd").value = currentApp.proposed_demand_3rd || "";
    document.getElementById("editDemand4th").value = currentApp.proposed_demand_4th || "";
    document.getElementById("editDemand5th").value = currentApp.proposed_demand_5th || "";

    document.getElementById("editModal").classList.add("show");
}

function closeEditModal() { document.getElementById("editModal").classList.remove("show"); }

async function saveEdit() {
    const newDivision = document.getElementById("editDivision").value;
    if (!newDivision) { showToast("Please select a Division", "error"); return; }

    const payload = {
        division: newDivision,
        substation: document.getElementById("editSubstation").value,
        connection_type: document.getElementById("editConnectionType").value,
        applicant: {
            ...currentApp.applicant,
            type: document.getElementById("editVoltageClass").value,
            address: document.getElementById("editAddress").value
        },
        proposed_demand_1st: document.getElementById("editDemand1st").value,
        proposed_demand_2nd: document.getElementById("editDemand2nd").value,
        proposed_demand_3rd: document.getElementById("editDemand3rd").value,
        proposed_demand_4th: document.getElementById("editDemand4th").value,
        proposed_demand_5th: document.getElementById("editDemand5th").value
    };

    try {
        await blockApi.update(appId, payload);
        showToast("Application updated successfully", "success");
        closeEditModal();
        loadData();
    } catch (e) {
        showToast(e.message, "error");
    }
}

// --- CASCADING DROPDOWNS ---
function updateRegions() {
    const zone = document.getElementById("editZone").value;
    const regSelect = document.getElementById("editRegion");
    regSelect.innerHTML = `<option value="" disabled selected>Select Region...</option>`;
    if (zone && orgData.zones[zone]) {
        Object.keys(orgData.zones[zone].regions).forEach(r => { regSelect.innerHTML += `<option value="${r}">${r}</option>`; });
        regSelect.disabled = false;
    }
}

function updateDivisions() {
    const zone = document.getElementById("editZone").value;
    const region = document.getElementById("editRegion").value;
    const divSelect = document.getElementById("editDivision");
    divSelect.innerHTML = `<option value="" disabled selected>Select Division...</option>`;
    if (zone && region && orgData.zones[zone].regions[region]) {
        Object.keys(orgData.zones[zone].regions[region]).forEach(d => { divSelect.innerHTML += `<option value="${d}">${d}</option>`; });
        divSelect.disabled = false;
    }
}

function updateSubStations() {
    const zone = document.getElementById("editZone").value;
    const region = document.getElementById("editRegion").value;
    const division = document.getElementById("editDivision").value;
    const subSelect = document.getElementById("editSubstation");
    subSelect.innerHTML = `<option value="" disabled selected>Select Sub-station...</option>`;
    if (zone && region && division && orgData.zones[zone].regions[region][division]) {
        const divData = orgData.zones[zone].regions[region][division];
        if (divData["Sub-stations"]) {
            Object.values(divData["Sub-stations"]).forEach(sub => { subSelect.innerHTML += `<option value="${sub}">${sub}</option>`; });
        }
        subSelect.disabled = false;
    }
}

// ==========================================
// BOOTSTRAP
// ==========================================
loadData();