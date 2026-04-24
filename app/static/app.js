let currentDbId = null;
let currentTable = null;
let currentPage = 1;
const limit = 100;
let totalRows = 0;

// Theme Initialization
const themeToggleBtn = document.getElementById('theme-toggle');
const moonIcon = document.getElementById('moon-icon');
const sunIcon = document.getElementById('sun-icon');

function setTheme(isDark) {
    if (isDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
        moonIcon.style.display = 'none';
        sunIcon.style.display = 'block';
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
        moonIcon.style.display = 'block';
        sunIcon.style.display = 'none';
        localStorage.setItem('theme', 'light');
    }
}

// Check local storage or system preference
const savedTheme = localStorage.getItem('theme');
const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    setTheme(true);
} else {
    setTheme(false);
}

themeToggleBtn.addEventListener('click', () => {
    const isDark = document.documentElement.hasAttribute('data-theme');
    setTheme(!isDark);
});

// Tab Switching
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    event.target.classList.add('active');
}

// Upload Form Submit
document.getElementById('upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('db-file');
    if (!fileInput.files.length) return;

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    await connectToDb('/api/upload', formData, 'upload');
});

// Local Path Form Submit
document.getElementById('local-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pathInput = document.getElementById('local-path').value;
    if (!pathInput) return;

    const formData = new FormData();
    formData.append('path', pathInput);

    await connectToDb('/api/connect_local', formData, 'local');
});

// Generic connect function
async function connectToDb(url, formData, type) {
    const statusEl = document.getElementById('connection-status');
    statusEl.textContent = 'Connecting...';
    statusEl.className = 'status-msg';

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            currentDbId = data.db_id;
            document.getElementById('db-name').textContent = data.filename;
            statusEl.textContent = 'Connected successfully!';
            statusEl.className = 'status-msg success';
            
            // Fetch tables
            await fetchTables();
        } else {
            statusEl.textContent = data.detail || 'Error connecting to database';
            statusEl.className = 'status-msg error';
        }
    } catch (err) {
        statusEl.textContent = 'Network error occurred';
        statusEl.className = 'status-msg error';
    }
}

// Fetch Tables
async function fetchTables() {
    if (!currentDbId) return;

    try {
        const response = await fetch(`/api/${currentDbId}/tables`);
        const data = await response.json();

        if (response.ok) {
            const listEl = document.getElementById('tables-list');
            listEl.innerHTML = '';
            
            data.tables.forEach(table => {
                const li = document.createElement('li');
                li.textContent = table;
                li.onclick = () => loadTable(table);
                listEl.appendChild(li);
            });

            document.querySelector('.tables-section').style.display = 'block';
            
            // Auto load first table if exists
            if (data.tables.length > 0) {
                loadTable(data.tables[0]);
            }
        }
    } catch (err) {
        console.error('Failed to fetch tables', err);
    }
}

// Load Table Data
async function loadTable(tableName, page = 1) {
    currentTable = tableName;
    currentPage = page;
    const offset = (page - 1) * limit;

    // Highlight active table in sidebar
    document.querySelectorAll('#tables-list li').forEach(li => {
        if (li.textContent === tableName) li.classList.add('active');
        else li.classList.remove('active');
    });

    try {
        const response = await fetch(`/api/${currentDbId}/table/${tableName}?limit=${limit}&offset=${offset}`);
        const data = await response.json();

        if (response.ok) {
            document.getElementById('welcome-msg').style.display = 'none';
            document.querySelector('.main-header').style.display = 'block';
            document.getElementById('data-container').style.display = 'flex';
            document.getElementById('current-table-name').textContent = `Table: ${tableName}`;
            
            totalRows = data.total_rows;
            updatePaginationInfo();
            renderTable(data.schema, data.rows);
        } else {
            showError(data.detail);
        }
    } catch (err) {
        showError('Failed to load table data');
    }
}

// Render Table
function renderTable(schema, rows) {
    const thead = document.getElementById('table-head');
    const tbody = document.getElementById('table-body');
    const errorMsg = document.getElementById('error-msg');
    
    thead.innerHTML = '';
    tbody.innerHTML = '';
    errorMsg.textContent = '';

    // Render Headers
    schema.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col.name;
        th.title = col.type || 'UNKNOWN'; // Show type on hover
        thead.appendChild(th);
    });

    // Render Rows
    if (rows.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = schema.length;
        td.textContent = 'No data available.';
        td.style.textAlign = 'center';
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
    }

    rows.forEach(row => {
        const tr = document.createElement('tr');
        schema.forEach(col => {
            const td = document.createElement('td');
            const val = row[col.name];
            // Handle nulls nicely
            if (val === null) {
                td.innerHTML = '<i style="color: #94a3b8;">NULL</i>';
            } else if (typeof val === 'object') {
                td.textContent = JSON.stringify(val);
            } else {
                td.textContent = val;
            }
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
}

// Custom Query Submit
document.getElementById('query-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentDbId) return;

    const query = document.getElementById('sql-query').value;
    if (!query.trim()) return;

    const formData = new FormData();
    formData.append('query', query);

    try {
        const response = await fetch(`/api/${currentDbId}/query`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (response.ok) {
            document.getElementById('current-table-name').textContent = 'Query Results';
            // Disable pagination for custom queries for simplicity
            document.querySelector('.pagination').style.display = 'none';
            document.getElementById('row-count-info').textContent = `${data.rows.length} row(s) returned`;
            
            renderTable(data.schema, data.rows);
        } else {
            showError(data.detail);
        }
    } catch (err) {
        showError('Query execution failed');
    }
});

// Pagination Controls
document.getElementById('prev-page').addEventListener('click', () => {
    if (currentPage > 1) {
        loadTable(currentTable, currentPage - 1);
    }
});

document.getElementById('next-page').addEventListener('click', () => {
    const maxPage = Math.ceil(totalRows / limit);
    if (currentPage < maxPage) {
        loadTable(currentTable, currentPage + 1);
    }
});

function updatePaginationInfo() {
    document.querySelector('.pagination').style.display = 'flex';
    const maxPage = Math.ceil(totalRows / limit) || 1;
    document.getElementById('page-info').textContent = `Page ${currentPage} of ${maxPage}`;
    document.getElementById('row-count-info').textContent = `${totalRows.toLocaleString()} total rows`;

    document.getElementById('prev-page').disabled = currentPage === 1;
    document.getElementById('next-page').disabled = currentPage === maxPage;
}

function showError(msg) {
    document.getElementById('error-msg').textContent = msg;
    document.getElementById('table-body').innerHTML = '';
}