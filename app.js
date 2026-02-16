// State Management
const state = {
    currentDate: new Date().toISOString().split('T')[0],
    currentCafeteria: null,
    // Data provided by user
    catalog: {
        "Breck": ["Croissant", "Chocolatín", "Hogaza", "Foccacia", "Brioche", "Croissant Almendra", "Galleta Chispas", "Galleta Chispas"],
        "Cafe del sur": ["Croissant", "Demi baguette", "Baguette", "Caja Blanco", "Caja Multigrano", "Bollo", "Ciabatta"],
        "Amïn": ["Croissant", "chocolarín", "Croissant Almendra", "Croissant Frutal", "Croissant Chocolate", "Chocolatín Almendra", "Scone", "Tartas Rústica", "Cocada", "Rol de Canela", "Galleta Chispas", "Galleta Avena", "Galleta Red Velvet", "Galleta Doble Chocolate", "Panque Zanahoria", "Panque Plátano", "Panque Limón", "Hogaza", "Ciabatta"],
        "Blom": ["Croissant", "Chocolatín", "Scone", "Galleta"],
        "Charcuteri": ["Croissant"],
        "Ponke": ["Hogaza", "Baguette", "Brioche", "Scone", "Tarta Rústica"],
        "Zuzu": ["Croissant", "Chocolatín", "Croissant Almendra", "Croissant Frutal", "Scone", "Muffin", "Croapan", "Rol de Canela"],
        "Versal": ["Hogaza"],
        "Taperia": ["Baguette"],
        "Panza": ["Croissant", "Chocolatín"]
    },
    orders: {} // { date: { cafeteria: { product: quantity } } }
};

const STORAGE_KEY = 'deliveryApp_data';

// DOM Elements
const app = document.getElementById('app');

// --- Core Logic ---

function loadData() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        state.orders = JSON.parse(stored);
    }
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.orders));
}

function getQuantity(product) {
    if (!state.currentCafeteria) return 0;
    return state.orders[state.currentDate]?.[state.currentCafeteria]?.[product] || 0;
}

function updateQuantity(product, delta, shouldRender = true) {
    if (!state.currentCafeteria) return;

    if (!state.orders[state.currentDate]) {
        state.orders[state.currentDate] = {};
    }
    if (!state.orders[state.currentDate][state.currentCafeteria]) {
        state.orders[state.currentDate][state.currentCafeteria] = {};
    }

    const currentQty = state.orders[state.currentDate][state.currentCafeteria][product] || 0;
    const newQty = Math.max(0, currentQty + delta);

    if (delta === 'reset') {
        state.orders[state.currentDate][state.currentCafeteria][product] = 0;
    } else {
        state.orders[state.currentDate][state.currentCafeteria][product] = newQty;
    }

    saveData();
    if (shouldRender) {
        renderDetail();
    }
}

// --- Views ---

function renderHome() {
    state.currentCafeteria = null;

    let html = `
        <h1>Cafeterías</h1>
        <div class="cafeteria-list">
    `;

    const cafeterias = Object.keys(state.catalog);

    cafeterias.forEach(cafeteria => {
        const todayOrders = state.orders[state.currentDate]?.[cafeteria] || {};
        const totalItems = Object.values(todayOrders).reduce((a, b) => a + b, 0);

        html += `
            <div class="card cafeteria-card" onclick="selectCafeteria('${cafeteria}')">
                <span class="cafeteria-name">${cafeteria}</span>
                ${totalItems > 0 ? `<span style="color: var(--accent-color); font-weight: bold;">${totalItems} items</span>` : ''}
            </div>
        `;
    });

    html += `</div>`;
    app.innerHTML = html;
}

function selectCafeteria(name) {
    state.currentCafeteria = name;
    renderDetail();
}

function renderDetail() {
    if (!state.currentCafeteria) return renderHome();

    // Sketch: "Nombre Cafeteria" (Top Left), "Fecha" (Top Right)
    // We'll use a clean header for this.

    let html = `
        <div class="detail-header">
             <div style="font-weight: 800; font-size: 24px; letter-spacing: -0.5px;">${state.currentCafeteria}</div>
             <div class="date-badge">${state.currentDate}</div>
        </div>
        
        <div class="product-list">
    `;

    const products = state.catalog[state.currentCafeteria] || [];

    // De-duplicate products just in case the input list has duplicates (like "Galleta Chispas" in Breck)
    const uniqueProducts = [...new Set(products)];

    uniqueProducts.forEach(product => {
        const qty = getQuantity(product);
        // Removed onclick, relying solely on attachLongPressHandlers pointer events
        html += `
            <div class="product-row" 
                 id="prod-${product.replace(/\s+/g, '-')}"
                 oncontextmenu="return false;">
                <span class="product-name">${product}</span>
                <div class="quantity-box">${qty > 0 ? qty : ''}</div>
            </div>
        `;
    });

    // Sketch shows "Guardar día" (Green) and "Ver Semana" (Blue/White) side by side
    html += `
        </div>
        <div class="action-buttons">
            <button class="btn btn-primary" onclick="saveDay()">Guardar día</button>
            <button class="btn btn-secondary" onclick="renderWeek()">Ver Semana</button>
        </div>
        <div style="text-align: center; margin-top: 20px;">
            <button style="background:none; border:none; color: var(--text-secondary); text-decoration: underline;" onclick="renderHome()">Volver al Inicio</button>
        </div>
    `;

    app.innerHTML = html;
    attachLongPressHandlers(uniqueProducts);
}

function renderWeek() {
    // Generate dates for the current week (Mon-Sun or relative to today)
    // Let's show last 7 days + today for simplicity, or just all data present?
    // User said "guardados por días".
    // Let's show a list of days where data exists for this cafeteria, or global?
    // "Ver Semana" is context-dependent? The sketch has it on the specific cafeteria card view.
    // So likely "Ver Semana" for THIS cafeteria.

    const cafeteria = state.currentCafeteria;
    const history = [];

    // Sort dates descending
    const dates = Object.keys(state.orders).sort().reverse();

    dates.forEach(date => {
        if (state.orders[date] && state.orders[date][cafeteria]) {
            const dayOrders = state.orders[date][cafeteria];
            const total = Object.values(dayOrders).reduce((a, b) => a + b, 0);
            if (total > 0) {
                history.push({ date, total, items: dayOrders });
            }
        }
    });

    let html = `
        <div class="detail-header">
            <button class="back-button" onclick="renderDetail()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                Volver
            </button>
            <h2>Semana: ${cafeteria}</h2>
        </div>
        <div class="cafeteria-list"> <!-- Reuse list style -->
    `;

    if (history.length === 0) {
        html += `<div style="padding: 20px; text-align: center; color: var(--text-secondary);">No hay registros.</div>`;
    } else {
        history.forEach(item => {
            let details = Object.entries(item.items)
                .filter(([_, qty]) => qty > 0)
                .map(([prod, qty]) => `${prod}: ${qty}`)
                .join(', ');

            html += `
                <div class="card" style="display: block;">
                    <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 8px;">
                        <span>${formatDate(item.date)}</span>
                        <span>${item.total} un.</span>
                    </div>
                    <div style="font-size: 14px; color: var(--text-secondary); line-height: 1.4;">
                        ${details}
                    </div>
                </div>
            `;
        });
    }

    html += `</div>`;
    app.innerHTML = html;
}

// --- Interaction Logic ---

let longPressTimer;
const LONG_PRESS_DURATION = 500; // ms

function attachLongPressHandlers(productsList) {
    productsList.forEach(product => {
        const id = `prod-${product.replace(/\s+/g, '-')}`;
        const el = document.getElementById(id);
        if (!el) return;

        let isLongPress = false;
        let isPressed = false; // Track if we are currently holding down

        const start = (e) => {
            // Only left click or touch
            if (e.pointerType === 'mouse' && e.button !== 0) return;

            isLongPress = false;
            isPressed = true;
            el.classList.add('active-state'); // Optional: custom active class if needed

            longPressTimer = setTimeout(() => {
                if (!isPressed) return;
                isLongPress = true;
                if (navigator.vibrate) navigator.vibrate(50);

                // Trigger reset WITHOUT re-rendering immediately to avoid destroying DOM
                updateQuantity(product, 'reset', false);

                // Visual feedback: manually update the specific element
                const qtyBox = el.querySelector('.quantity-box');
                if (qtyBox) qtyBox.textContent = '0';

                el.classList.add('clearing');
                setTimeout(() => el.classList.remove('clearing'), 300);
            }, LONG_PRESS_DURATION);
        };

        const end = (e) => {
            isPressed = false;
            clearTimeout(longPressTimer);
            el.classList.remove('active-state');

            if (isLongPress) {
                // Interaction ended after long press, now we can safely re-render everything to be consistent
                renderDetail();
            } else {
                // Normal tap
                updateQuantity(product, 1);
            }
        };

        const cancel = (e) => {
            isPressed = false;
            clearTimeout(longPressTimer);
            el.classList.remove('active-state');
            // If we cancelled after long press trigger (e.g. drag out), we should probably re-render to be safe
            if (isLongPress) renderDetail();
        };

        el.addEventListener('pointerdown', start);
        el.addEventListener('pointerup', end);
        el.addEventListener('pointerleave', cancel);
        el.addEventListener('pointercancel', cancel);
    });
}

function saveDay() {
    // Just feedback since we save on every click
    alert(`Pedido guardado para ${state.currentCafeteria}`);
    renderHome();
}

// --- Init ---

loadData();
renderHome();
