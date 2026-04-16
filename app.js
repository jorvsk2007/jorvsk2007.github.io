const URL_SB = 'https://kxnxjxiwcbypudikbais.supabase.co';
const KEY_SB = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4bnhqeGl3Y2J5cHVkaWtiYWlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxOTAwNzUsImV4cCI6MjA4ODc2NjA3NX0.5O7Wlzz3XRRlWky9LNPtu2-xbznBYOmC0lmBWgbArCs';
const supabaseClient = supabase.createClient(URL_SB, KEY_SB);

let usuarioActual = null;
let carrito = [];

// MODALES
function abrirLogin() { document.getElementById('modal-login').classList.remove('hidden'); }
function cerrarLogin() { document.getElementById('modal-login').classList.add('hidden'); }
function abrirBuscador() { document.getElementById('modal-busqueda').classList.remove('hidden'); filtrarProductos(''); }
function cerrarBuscador() { document.getElementById('modal-busqueda').classList.add('hidden'); }

// LOGIN
async function ejecutarLogin() {
    const curp = document.getElementById('input-curp').value.trim();
    
    // Consulta exacta a tus tablas
    const { data, error } = await supabaseClient
        .from('TRABAJADORES')
        .select('curp, rol, PERSONA(nombre)')
        .eq('curp', curp)
        .maybeSingle();

    if (error) {
        console.error("Error:", error);
        return;
    }

    if (data) {
        usuarioActual = data;
        document.getElementById('modal-login').classList.add('hidden');
        document.getElementById('btn-login-header').classList.add('hidden');
        document.getElementById('user-info').classList.remove('hidden');
        document.getElementById('main-nav').classList.remove('hidden');
        document.getElementById('display-user-name').innerText = `${data.rol}: ${data.PERSONA.nombre}`;
        irAVentas();
    } else {
        document.getElementById('error-login').classList.remove('hidden');
    }
}

function cerrarSesion() { location.reload(); }

// NAVEGACIÓN Y VENTAS
function irAVentas() {
    document.getElementById('app-view').innerHTML = `
        <h2>Panel de Ventas</h2>
        <button onclick="abrirBuscador()">🔍 Buscar Producto</button>
        <table>
            <thead><tr><th>Producto</th><th>Precio</th></tr></thead>
            <tbody id="ticket-body"></tbody>
        </table>
        <div style="margin-top:20px; font-weight:bold;">Total: $<span id="total-monto">0.00</span></div>
    `;
}

async function irAProductos() {
    const { data } = await supabaseClient.from('PRODUCTO').select('*');
    document.getElementById('app-view').innerHTML = `
        <h2>Inventario</h2>
        <table>
            <thead><tr><th>ID</th><th>Nombre</th><th>Stock</th></tr></thead>
            <tbody>${data.map(p => `<tr><td>${p.id_producto}</td><td>${p.nombre}</td><td>${p.cant_exist}</td></tr>`).join('')}</tbody>
        </table>
    `;
}

async function filtrarProductos(termino) {
    let query = supabaseClient.from('PRODUCTO').select('*');
    if(termino) query = query.ilike('nombre', `%${termino}%`);
    const { data } = await query;
    document.getElementById('lista-busqueda').innerHTML = data.map(p => `
        <tr>
            <td>${p.id_producto}</td><td>${p.nombre}</td><td>$${p.precio}</td><td>${p.cant_exist}</td>
            <td><button onclick="sumarAlTicket('${p.nombre}', ${p.precio})">Añadir</button></td>
        </tr>`).join('');
}

function sumarAlTicket(nombre, precio) {
    carrito.push({ nombre, precio });
    cerrarBuscador();
    const body = document.getElementById('ticket-body');
    let total = 0;
    body.innerHTML = carrito.map(i => {
        total += i.precio;
        return `<tr><td>${i.nombre}</td><td>$${i.precio}</td></tr>`;
    }).join('');
    document.getElementById('total-monto').innerText = total.toFixed(2);
}
