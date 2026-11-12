// nsc-dashboard.js
let barChartInstance = null;
let lineChartInstance = null;
let allOrgData = {};

document.addEventListener("DOMContentLoaded", () => {
    loadOrgStructure();
    loadFilterOptions();
    setupEventListeners();
});

async function loadOrgStructure() {
    try {
        const data = await apiFetch("/api/org-structure");
        allOrgData = data.zones || {}; 
        const zoneSelect = document.getElementById('filter_zone');
        zoneSelect.innerHTML = '<option value="">All Zones</option>';
        if (data.zones) {
            Object.keys(data.zones).forEach(zone => {
                zoneSelect.innerHTML += `<option value="${zone}">${zone}</option>`;
            });
        }
        fetchDashboardData();
    } catch (err) {
        console.error("Failed to load org structure", err);
        showToast("Failed to load filter options", "error");
    }
}

async function loadFilterOptions() {
    try {
        const data = await apiFetch("/api/blocks/nsc_monitoring/filter-options");
        const classSelect = document.getElementById("filter_conn_class");
        if (classSelect && data && data.classes) {
            classSelect.innerHTML = '<option value="">All Classes</option>';
            data.classes.forEach(cls => {
                classSelect.innerHTML += `<option value="${cls}">${cls}</option>`;
            });
        }
    } catch (err) {
        console.error("Failed to load filter options (classes)", err);
    }
}

function setupEventListeners() {
    const zoneSelect = document.getElementById('filter_zone');
    const regSelect = document.getElementById('filter_reg');
    const divSelect = document.getElementById('filter_divn_name');
    const cccSelect = document.getElementById('filter_ccc_code');

    zoneSelect.addEventListener('change', (e) => {
        const zone = e.target.value;
        regSelect.innerHTML = '<option value="">All Regions</option>';
        divSelect.innerHTML = '<option value="">All Divisions</option>';
        cccSelect.innerHTML = '<option value="">All CCCs</option>';

        if (zone && allOrgData[zone]) {
            Object.keys(allOrgData[zone].regions).forEach(reg => {
                regSelect.innerHTML += `<option value="${reg}">${reg}</option>`;
            });
        }
        fetchDashboardData();
    });

    regSelect.addEventListener('change', (e) => {
        const zone = zoneSelect.value;
        const reg = e.target.value;
        divSelect.innerHTML = '<option value="">All Divisions</option>';
        cccSelect.innerHTML = '<option value="">All CCCs</option>';

        if (zone && reg && allOrgData[zone]?.regions[reg]) {
            Object.keys(allOrgData[zone].regions[reg]).forEach(div => {
                divSelect.innerHTML += `<option value="${div}">${div}</option>`;
            });
        }
        fetchDashboardData();
    });

    divSelect.addEventListener('change', (e) => {
        const zone = zoneSelect.value;
        const reg = regSelect.value;
        const div = e.target.value;
        cccSelect.innerHTML = '<option value="">All CCCs</option>';

        if (zone && reg && div && allOrgData[zone]?.regions[reg]?.[div]) {
            const cccs = allOrgData[zone].regions[reg][div]["CCCs"] || [];
            cccs.forEach(ccc => {
                cccSelect.innerHTML += `<option value="${ccc.code}">${ccc.name} (${ccc.code})</option>`;
            });
        }
        fetchDashboardData();
    });

    document.getElementById('filter_conn_class').addEventListener('change', fetchDashboardData);
    document.getElementById('filter_no_of_poles').addEventListener('change', fetchDashboardData);
    cccSelect.addEventListener('change', fetchDashboardData);
}

async function fetchDashboardData() {
    const zone = document.getElementById("filter_zone").value;
    const reg = document.getElementById("filter_reg").value;
    const divn = document.getElementById("filter_divn_name").value;
    const ccc = document.getElementById("filter_ccc_code").value;
    const connClass = document.getElementById("filter_conn_class").value;
    const poles = document.getElementById("filter_no_of_poles").value;

    const query = `?zone=${zone}&reg=${reg}&divn_name=${divn}&supp_off=${ccc}&conn_class=${connClass}&no_of_poles=${poles}`;

    try {
        const data = await apiFetch(`/api/blocks/nsc_monitoring/kpi-dashboard${query}`);
        
        document.getElementById("kpi-total").innerText = data.total_cases || 0;
        document.getElementById("kpi-pending").innerText = data.pending_count || 0;
        document.getElementById("kpi-avg-delay").innerText = (data.avg_delay || 0).toFixed(2);
        document.getElementById("kpi-qtndelay").innerText = (data.quotation_delay || 0).toFixed(2);
        document.getElementById("kpi-wodelay").innerText = (data.wo_delay || 0).toFixed(2);
        document.getElementById("kpi-conndelay").innerText = (data.conn_delay || 0).toFixed(2);

        renderBarChart(data.region_data || []);
        
    } catch (err) {
        console.error("Failed to fetch dashboard data", err);
    }
}

function renderBarChart(regionData) {
    const canvas = document.getElementById('barChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (barChartInstance) {
        barChartInstance.destroy();
    }

    const labels = regionData.length > 0 ? regionData.map(r => r._id || "Unknown") : ["No Data"];
    const values = regionData.length > 0 ? regionData.map(r => r.count || 0) : [0];

    barChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Cases',
                data: values,
                backgroundColor: '#3b82f6',
                borderRadius: 4
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            animation: false
        }
    });
}
