<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PM Surya Ghar — Common UI</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/css/base.css" />
    <link rel="stylesheet" href="/css/layout.css" />
    <link rel="stylesheet" href="/css/components.css" />
    <link rel="stylesheet" href="/css/modals.css" />
    <style>
        :root { --bg-dark: #0b1329; --bg-card: #111c38; --bg-card-hover: #19274c; --accent-amber: #f59e0b; --text-main: #f8fafc; --text-muted: #94a3b8; --border-color: #1e293b; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background-color: var(--bg-dark); color: var(--text-main); font-family: 'Inter', sans-serif; min-height: 100vh; padding-bottom: 50px; }
        .container { max-width: 1400px; margin: 0 auto; padding: 25px 20px; }
        .header { display: flex; justify-content: space-between; align-items: center; background: var(--bg-card); padding: 18px 24px; border-radius: 12px; border: 1px solid var(--border-color); margin-bottom: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
        .header h1 { font-size: 20px; font-weight: 800; color: var(--accent-amber); display: flex; align-items: center; gap: 10px; }
        .header-actions { display: flex; gap: 10px; align-items: center; }
        .btn-outline { background: transparent; border: 1px solid var(--accent-amber); color: var(--accent-amber); padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer; text-decoration: none; }
        .btn-outline:hover { background: rgba(245, 158, 11, 0.1); }
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .kpi-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
        .kpi-title { font-size: 13px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px; }
        .kpi-value { font-size: 26px; font-weight: 800; color: var(--text-main); }
        .filter-bar { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 18px; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)) auto; gap: 12px; align-items: center; margin-bottom: 24px; }
        .filter-group { display: flex; flex-direction: column; gap: 6px; }
        .filter-group label { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; }
        .filter-select, .filter-search { background: var(--bg-dark); border: 1px solid var(--border-color); color: var(--text-main); padding: 10px 12px; border-radius: 8px; font-size: 13px; outline: none; }
        .filter-select:focus, .filter-search:focus { border-color: var(--accent-amber); }
        .table-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.2); margin-bottom: 24px; }
        .table-responsive { width: 100%; overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
        th { background: rgba(255,255,255,0.03); color: var(--accent-amber); font-weight: 700; padding: 14px 16px; border-bottom: 1px solid var(--border-color); white-space: nowrap; }
        td { padding: 14px 16px; border-bottom: 1px solid var(--border-color); color: var(--text-main); white-space: nowrap; }
        tr:hover td { background: rgba(255,255,255,0.02); }
        .empty-banner { text-align: center; padding: 50px 20px; color: var(--text-muted); font-weight: 600; font-size: 15px; }
        .pagination { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; background: var(--bg-card); border-top: 1px solid var(--border-color); }
        .pagination button { background: var(--bg-dark); border: 1px solid var(--border-color); color: var(--text-main); padding: 8px 14px; border-radius: 6px; font-weight: 700; cursor: pointer; }
        .pagination button:hover:not(:disabled) { border-color: var(--accent-amber); }
        .pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
    </style>
</head>
</html>
