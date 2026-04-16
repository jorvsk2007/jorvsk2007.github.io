// CONFIGURACIÓN SUPABASE
const _supabaseUrl = 'https://kxnxjxiwcbypudikbais.supabase.co';
const _supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4bnhqeGl3Y2J5cHVkaWtiYWlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxOTAwNzUsImV4cCI6MjA4ODc2NjA3NX0.5O7Wlzz3XRRlWky9LNPtu2-xbznBYOmC0lmBWgbArCs';
const supabase = supabase.createClient(_supabaseUrl, _supabaseKey);

let carrito = [];
let ultimaVentaTotal = 0;
let usuarioLogueado = null;

// NAVEGACIÓN
function navegar(pantalla) {
    const content = document.getElementById('app-content');
    if (pantalla === 'ventas') {
        content.innerHTML = `
            <div class="ventas-container">
                <div class="ticket-panel">
                    <h2>Ticket de Venta</h2>
                    <button onclick="abrirModalBusqueda()">+ Agregar Producto</button>
                    <table id="tabla-ticket">
                        <thead><tr><th>Prod</th><th>Cant</th><th>Subtotal</th></tr></thead>
                        <tbody id="body-ticket"></tbody>
                    </table>
                </div>
                <div class="totales-panel">
                    <h3>TOTAL ACTUAL: $<span id="total-actual">0.00</span></h3>
                    <p>Venta anterior: $<span id="total-anterior">${ultimaVentaTotal}</span></p>
                    <button onclick="finalizarVenta()" style="background: #22c55e; color: white;">Registrar Venta</button>
                </div>
            </div>`;
    } else if (pantalla === 'productos') {
        renderizarProductos();
    }
}

// BÚSQUEDA EN MODAL
async function abrirModalBusqueda() {
    document.getElementById('modal-busqueda').classList.remove('hidden');
    buscarProductos(''); // Carga inicial
}

async function buscarProductos(termino) {
    let query = supabase.from('PRODUCTO').select('*');
    if(termino) query = query.ilike('nombre', `%${termino}%`);
    
    const { data, error } = await query;
    const tbody = document.getElementById('body-resultados');
    tbody.innerHTML = data.map(p => `
        <tr>
            <td>${p.id_producto}</td>
            <td>${p.nombre}</td>
            <td>$${p.precio}</td>
            <td>${p.cant_exist}</td>
            <td><button onclick="agregarAlTicket('${p.id_producto}', '${p.nombre}', ${p.precio})">Elegir</button></td>
        </tr>
    `).join('');
}

function agregarAlTicket(id, nombre, precio) {
    carrito.push({ id, nombre, precio, cantidad: 1 });
    actualizarInterfazTicket();
    cerrarModal();
}

function actualizarInterfazTicket() {
    const tbody = document.getElementById('body-ticket');
    let total = 0;
    tbody.innerHTML = carrito.map(item => {
        total += item.precio;
        return `<tr><td>${item.nombre}</td><td>1</td><td>$${item.precio}</td></tr>`;
    }).join('');
    document.getElementById('total-actual').innerText = total.toFixed(2);
}

// LOGIN Y PRIVILEGIOS
async function login(curp) {
    const { data, error } = await supabase
        .from('TRABAJADORES')
        .select('*, PERSONA(nombre)')
        .eq('curp', curp).single();

    if (data) {
        usuarioLogueado = data;
        document.getElementById('user-profile').classList.remove('hidden');
        document.getElementById('user-name').innerText = data.rol + ": " + data.PERSONA.nombre;
        document.getElementById('btn-login-main').classList.add('hidden');
        navegar('ventas');
    }
}

function cerrarModal() {
    document.getElementById('modal-busqueda').classList.add('hidden');
}
