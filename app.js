const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbztMgStCjjof9pzWyayC9F4aG3IkB3ZRbhDLk-aGmsy2Ngje44S6py7BpOu-Sm8benu3A/exec'; 

let globalData = [];
let currentUser = '';

document.addEventListener('DOMContentLoaded', () => {
    try {
        checkAuth();
        initNavigation();
    } catch(e) {
        console.error(e);
    }
});

function switchAuthMode(mode) {
    if (mode === 'register') {
        document.getElementById('loginCard').style.display = 'none';
        document.getElementById('registerCard').style.display = 'block';
    } else {
        document.getElementById('registerCard').style.display = 'none';
        document.getElementById('loginCard').style.display = 'block';
    }
}

function togglePassword(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

function checkAuth() {
    const localUser = localStorage.getItem('it_asset_user');
    const sessionUser = sessionStorage.getItem('it_asset_user');
    const activeUser = localUser || sessionUser;
    
    const authOverlay = document.getElementById('authOverlay');
    const currentUserDisplay = document.getElementById('currentUserDisplay');
    
    if (!authOverlay || !currentUserDisplay) return;

    if (!activeUser) {
        authOverlay.style.display = 'flex';
        
        const savedEmail = localStorage.getItem('it_asset_saved_email');
        const savedPass = localStorage.getItem('it_asset_saved_pass');
        
        if (savedEmail && savedPass) {
            document.getElementById('loginEmail').value = savedEmail;
            document.getElementById('loginPassword').value = savedPass;
            document.getElementById('rememberMe').checked = true;
        } else {
            document.getElementById('loginEmail').value = '';
            document.getElementById('loginPassword').value = '';
            document.getElementById('rememberMe').checked = false;
        }
    } else {
        currentUser = activeUser;
        authOverlay.style.display = 'none';
        currentUserDisplay.innerText = `User: ${currentUser}`;
        fetchData();
    }
}

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader('Registering...');

    const payload = {
        action: 'register',
        name: document.getElementById('regName').value.trim(),
        email: document.getElementById('regEmail').value.trim(),
        password: document.getElementById('regPassword').value
    };

    try {
        const res = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        
        if(result.status === 'success') {
            alert('Registration successful! Please wait for Admin approval.');
            document.getElementById('registerForm').reset();
            switchAuthMode('login');
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        alert('Connection error occurred.');
    }
    hideLoader();
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader('Verifying credentials...');

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    const payload = {
        action: 'login',
        email: email,
        password: password
    };

    try {
        const res = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        
        if(result.status === 'success') {
            const userName = result.name;
            
            if (rememberMe) {
                localStorage.setItem('it_asset_saved_email', email);
                localStorage.setItem('it_asset_saved_pass', password);
                localStorage.setItem('it_asset_user', userName);
            } else {
                localStorage.removeItem('it_asset_saved_email');
                localStorage.removeItem('it_asset_saved_pass');
                sessionStorage.setItem('it_asset_user', userName);
            }
            checkAuth();
        } else {
            alert('Login failed: ' + result.message);
        }
    } catch (error) {
        alert('Connection error occurred.');
    }
    hideLoader();
});

function logout() {
    localStorage.removeItem('it_asset_user');
    sessionStorage.removeItem('it_asset_user');
    globalData = [];
    document.getElementById('dashboardBody').innerHTML = '';
    checkAuth();
}

function initNavigation() {
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menuToggle');
    const navItems = document.querySelectorAll('.nav-item');
    const viewSections = document.querySelectorAll('.view-section');
    const topbarTitle = document.getElementById('topbarTitle');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('closed');
        });
    }

    if (window.innerWidth <= 768 && sidebar) {
        sidebar.classList.add('closed');
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            const targetId = item.getAttribute('data-target');
            viewSections.forEach(section => section.classList.remove('active'));
            const targetSection = document.getElementById(targetId);
            if(targetSection) targetSection.classList.add('active');

            if(topbarTitle) topbarTitle.innerText = item.innerText.trim();

            if (window.innerWidth <= 768 && sidebar) {
                sidebar.classList.add('closed');
            }
        });
    });
}

function showLoader(text) {
    document.getElementById('loaderText').innerText = text;
    document.getElementById('loader').style.display = 'flex';
}

function hideLoader() {
    document.getElementById('loader').style.display = 'none';
}

async function fetchData() {
    showLoader('Loading data...');
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getDashboard`);
        const json = await response.json();
        
        globalData = json.dashboard;
        updateDatalists(globalData, json.branches, json.depts);
        applyFilters();
    } catch (error) {
        alert('Failed to load data. Please check Web App URL.');
    }
    hideLoader();
}

function updateDatalists(dashboardData, branchListItems, deptListItems) {
    const snSet = new Set();
    const nameSet = new Set();

    dashboardData.forEach(row => {
        if (row['S/N (Serial Number)']) snSet.add(row['S/N (Serial Number)'].toString().trim());
        if (row['ชื่อผู้รับผิดชอบ']) nameSet.add(row['ชื่อผู้รับผิดชอบ'].toString().trim());
    });

    document.getElementById('snList').innerHTML = Array.from(snSet).map(val => `<option value="${val}">`).join('');
    document.getElementById('nameList').innerHTML = Array.from(nameSet).map(val => `<option value="${val}">`).join('');
    
    document.getElementById('branchList').innerHTML = branchListItems.map(val => `<option value="${val}">`).join('');
    document.getElementById('deptList').innerHTML = deptListItems.map(val => `<option value="${val}">`).join('');
}

function renderTable(dataToRender) {
    const tbody = document.getElementById('dashboardBody');
    tbody.innerHTML = '';
    
    dataToRender.forEach(row => {
        if (row['S/N (Serial Number)']) {
            const tr = document.createElement('tr');
            
            let status = row['Status'] || 'Available';
            let badgeClass = 'status-available';
            if (status === 'Pending') badgeClass = 'status-pending';
            if (status === 'In Use') badgeClass = 'status-inuse';

            let updateInfo = row['UpdatedBy'] || '-';
            
            tr.innerHTML = `
                <td>${row['S/N (Serial Number)']}</td>
                <td>${row['ชื่ออุปกรณ์หลัก'] || '-'}</td>
                <td>${row['ชื่อผู้รับผิดชอบ'] || '-'}</td>
                <td>${row['สาขา'] || '-'}</td>
                <td>${row['แผนก'] || '-'}</td>
                <td><span class="status-badge ${badgeClass}">${status}</span></td>
                <td style="color: #8e8e8e; font-size: 12px;">${updateInfo}</td>
            `;
            tbody.appendChild(tr);
        }
    });
}

function applyFilters() {
    const nameFilter = document.getElementById('filterName').value.toLowerCase();

    const filteredData = globalData.filter(row => {
        if (nameFilter) {
            const owner = (row['ชื่อผู้รับผิดชอบ'] || '').toString().toLowerCase();
            const device = (row['ชื่ออุปกรณ์หลัก'] || '').toString().toLowerCase();
            const sn = (row['S/N (Serial Number)'] || '').toString().toLowerCase();
            return owner.includes(nameFilter) || device.includes(nameFilter) || sn.includes(nameFilter);
        }
        return true;
    });

    renderTable(filteredData);
}

function clearFilters() {
    document.getElementById('filterName').value = '';
    applyFilters();
}

document.getElementById('checkoutForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader('Submitting request...');

    const payload = {
        action: 'checkout',
        actor: currentUser,
        sn: document.getElementById('co_sn').value,
        name: document.getElementById('co_name').value,
        branch: document.getElementById('co_branch').value,
        dept: document.getElementById('co_dept').value,
        email: document.getElementById('co_email').value
    };

    try {
        const res = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        const resultData = await res.json();
        
        if(resultData.status === 'success') {
            alert('Request successful! A confirmation email has been sent.');
            document.getElementById('checkoutForm').reset();
            await fetchData();
            document.querySelector('[data-target="dashboard"]').click();
        } else {
            alert('Error: ' + (resultData.message || 'S/N not found.'));
        }
    } catch (error) {
        alert('Error submitting request.');
    }
    hideLoader();
});

document.getElementById('checkinForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader('Processing check-in...');

    const payload = {
        action: 'checkin',
        actor: currentUser,
        sn: document.getElementById('ci_sn').value
    };

    try {
        const res = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        const resultData = await res.json();

        if(resultData.status === 'success') {
            alert('Check-in successful. Previous assignee data cleared.');
            document.getElementById('checkinForm').reset();
            await fetchData();
            document.querySelector('[data-target="dashboard"]').click();
        } else {
            alert('Error: ' + (resultData.message || 'S/N not found.'));
        }
    } catch (error) {
        alert('Error processing check-in.');
    }
    hideLoader();
});