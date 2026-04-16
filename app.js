// 1. CONFIGURACIÓN INICIAL
const URL_SB = 'https://kxnxjxiwcbypudikbais.supabase.co';
const KEY_SB = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4bnhqeGl3Y2J5cHVkaWtiYWlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxOTAwNzUsImV4cCI6MjA4ODc2NjA3NX0.5O7Wlzz3XRRlWky9LNPtu2-xbznBYOmC0lmBWgbArCs';

const supabaseClient = supabase.createClient(URL_SB, KEY_SB);

let usuarioActual = null;
let carrito = [];
let totalVentaAnterior = 0;

// 2. FUNCIONES DE INTERFAZ (MODALES Y MENÚS)
function abrirLogin() {
    document.getElementById('modal-login').classList.remove('hidden');
    document.getElementById('input-curp').focus();
}

function cerrarLogin() {
    document.getElementById('modal-login').classList.add('hidden');
    document.getElementById('login-error-msg').classList.add('hidden');
}

function toggleDropdown() {
    document.getElementById('user-dropdown').classList.toggle('hidden');
}

function abrirBuscador() {
    document.getElementById('modal-busqueda').classList.remove('hidden');
    document.getElementById('search-input').value = '';
    filtrarProductos(''); // Carga inicial de todos los productos
}

function cerrarBuscador() {
    document.getElementById('modal-busqueda').classList.add('hidden');
}

// 3. LÓGICA DE LOGIN
async function ejecutarLogin() {
    const curp = document.getElementById('input-curp').value.trim();
    const errorMsg = document.getElementById('login-error-msg');
    
    console.log("Intentando login con CURP:", curp); // Esto sale en F12

    try {
        const { data, error } = await supabaseClient
            .from('trabajadores') // <-- En minúsculas
            .select('curp, rol, persona(nombre, apellidos)') // <-- En minúsculas
            .eq('curp', curp)
            .maybeSingle();

        if (error) {
            alert("Error de Supabase: " + error.message);
            console.error(error);
            return;
        }

        if (data) {
            console.log("Datos encontrados:", data);
            usuarioActual = data;
            
            // Forzamos la actualización visual
            document.getElementById('modal-login').classList.add('hidden');
            document.getElementById('btn-login-trigger').classList.add('hidden');
            document.getElementById('user-profile').classList.remove('hidden');
            document.getElementById('main-nav').classList.remove('hidden');
            
            // Verificamos si PERSONA existe en el objeto devuelto
            const nombreCompleto = data.persona ? data.persona.nombre : "Usuario"; 
            document.getElementById('user-display-name').innerText = `${data.rol}: ${nombreCompleto}`;
            
           const rol = usuarioActual.rol.toLowerCase();

            if (rol === 'almacenista') {
                irAProductos(); // Los mandamos directo a ver productos
            } else {
                irAVentas(); // Admin y Cajeros a Ventas
            }
            alert("¡Bienvenido " + nombreCompleto + "!");
        } else {
            // Si llega aquí, es que la consulta corrió pero no encontró la CURP
            errorMsg.classList.remove('hidden');
            alert("La CURP no existe en la tabla TRABAJADORES");
        }
    } catch (e) {
        alert("Error crítico en el script: " + e.message);
    }
}

function cerrarSesion() {
    usuarioActual = null;
    location.reload();
}

// 4. NAVEGACIÓN Y RENDERIZADO DE VISTAS
function navegar(pantalla, btn) {
    // 1. Limpiamos espacios y pasamos a minúsculas
    const rolActual = usuarioActual.rol.trim().toLowerCase();
    console.log("Rol detectado en navegación:", rolActual);

    // 2. Bloqueo de Reportes
    if (pantalla === 'reportes') {
        if (rolActual !== 'admin') {
            alert(`Acceso Denegado. Tu rol es "${usuarioActual.rol}", se requiere "Admin".`);
            return;
        }
    }

    // 3. Bloqueo de Ventas para Almacenista
    if (pantalla === 'ventas' && rolActual === 'almacenista') {
        alert("Los almacenistas no tienen permiso para realizar ventas.");
        return;
    }

    // Si pasa, cambiamos la vista
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    if (pantalla === 'ventas') irAVentas();
    if (pantalla === 'productos' || pantalla === 'inventario') irAProductos();
    if (pantalla === 'reportes') irAReportes(); 
}

function irAVentas() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div class="ventas-view">
            <div class="ticket-section">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                    <h2 style="margin:0;">Venta en curso</h2>
                    <button class="btn-confirm" onclick="abrirBuscador()" style="background:var(--accent);">+ Agregar Producto</button>
                </div>
                <table class="ticket-table">
                    <thead>
                        <tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Subtotal</th><th></th></tr>
                    </thead>
                    <tbody id="ticket-body"></tbody>
                </table>
            </div>
            <div class="totals-section">
                <div class="last-sale">Venta anterior: $${totalVentaAnterior.toFixed(2)}</div>
                <div class="current-total">
                    <label>TOTAL ACTUAL</label>
                    <span id="display-total">$0.00</span>
                </div>
                <button class="btn-vender" onclick="registrarVenta()">FINALIZAR Y REGISTRAR</button>
            </div>
        </div>
    `;
    actualizarVistaTicket();
}

async function irAProductos() {
    const main = document.getElementById('main-content');
    const { data, error } = await supabaseClient.from('producto').select('*');
    
    // Verificamos el rol para mostrar el botón
    const rol = usuarioActual.rol.toLowerCase();
    const puedeAgregar = (rol === 'admin' || rol === 'almacenista');

    main.innerHTML = `
        <div style="background:white; padding:30px; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.08);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px;">
                <h2 style="margin:0; font-size:32px;">Inventario General</h2>
                ${puedeAgregar ? `<button class="btn-confirm" onclick="abrirModalProducto()" style="background:var(--accent);">+ Nuevo Producto</button>` : ''}
            </div>
            <table style="width:100%; text-align:left; font-size:18px;">
                <thead style="background:#f8fafc;">
                    <tr><th>ID</th><th>Nombre</th><th>Precio</th><th>Stock</th></tr>
                </thead>
                <tbody>
                    ${data.map(p => `
                        <tr style="border-bottom:1px solid #eee;">
                            <td style="padding:15px;">${p.id_producto}</td>
                            <td>${p.nombre}</td>
                            <td>$${p.precio.toFixed(2)}</td>
                            <td>${p.cant_exist}</td>
                        </tr>`).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// 5. LÓGICA DE VENTA (EL TICKET)
async function filtrarProductos(termino) {
    let query = supabaseClient.from('producto').select('*');
    if (termino) query = query.ilike('nombre', `%${termino}%`);
    
    const { data } = await query;
    const body = document.getElementById('search-results-body');
    body.innerHTML = data.map(p => `
        <tr>
            <td>${p.id_producto}</td>
            <td><strong>${p.nombre}</strong></td>
            <td>$${p.precio}</td>
            <td>${p.cant_exist}</td>
            <td><button class="btn-confirm" onclick="añadirAlCarrito('${p.id_producto}', '${p.nombre}', ${p.precio})">Añadir</button></td>
        </tr>
    `).join('');
}

function añadirAlCarrito(id, nombre, precio) {
    const index = carrito.findIndex(item => item.id === id);
    if (index !== -1) {
        carrito[index].cantidad++;
    } else {
        carrito.push({ id, nombre, precio, cantidad: 1 });
    }
    cerrarBuscador();
    actualizarVistaTicket();
}

function quitarDelCarrito(index) {
    carrito.splice(index, 1);
    actualizarVistaTicket();
}

function actualizarVistaTicket() {
    const body = document.getElementById('ticket-body');
    const displayTotal = document.getElementById('display-total');
    if (!body) return;

    let sumaTotal = 0;
    body.innerHTML = carrito.map((item, idx) => {
        const subtotal = item.precio * item.cantidad;
        sumaTotal += subtotal;
        return `
            <tr>
                <td>${item.nombre}</td>
                <td>${item.cantidad}</td>
                <td>$${item.precio.toFixed(2)}</td>
                <td>$${subtotal.toFixed(2)}</td>
                <td><button onclick="quitarDelCarrito(${idx})" style="color:red; border:none; background:none; cursor:pointer;">✖</button></td>
            </tr>
        `;
    }).join('');

    displayTotal.innerText = `$${sumaTotal.toFixed(2)}`;
}

async function registrarVenta() {
    if (carrito.length === 0) return alert("El ticket está vacío.");

    try {
        // 1. Insertar en la tabla 'ventas' con tus columnas específicas
        const { data: venta, error: errorVenta } = await supabaseClient
            .from('ventas')
            .insert([{ 
                // id_venta y fecha se suelen generar solos en la DB
                precio_total: parseFloat(document.getElementById('display-total').innerText.replace('$', '')),
                curp_cliente: "GOMA000000HDFRRN00", // Cambia esto o pide el CURP del cliente
                curp_trabajador: usuarioActual.curp 
            }])
            .select()
            .single();

        if (errorVenta) throw errorVenta;

        // 2. Descontar existencias en la tabla 'producto'
        for (const item of carrito) {
            // Consultamos stock actual primero
            const { data: prod } = await supabaseClient
                .from('producto')
                .select('cant_exist')
                .eq('id_producto', item.id)
                .single();

            const nuevoStock = prod.cant_exist - item.cantidad;

            if (nuevoStock < 0) {
                alert(`¡Alerta! Stock insuficiente para ${item.nombre}`);
                continue;
            }

            await supabaseClient
                .from('producto')
                .update({ cant_exist: nuevoStock })
                .eq('id_producto', item.id);
        }

        totalVentaAnterior = parseFloat(document.getElementById('display-total').innerText.replace('$', ''));
        alert("Venta #" + venta.id_venta + " registrada. Inventario actualizado.");
        
        carrito = [];
        irAVentas();

    } catch (err) {
        console.error("Error completo:", err);
        alert("No se pudo registrar: " + err.message);
    }
}

function abrirModalProducto() {
    document.getElementById('modal-nuevo-producto').classList.remove('hidden');
}

function cerrarModalProducto() {
    document.getElementById('modal-nuevo-producto').classList.add('hidden');
    // Limpiar campos
    document.getElementById('reg-nombre').value = '';
    document.getElementById('reg-precio').value = '';
    document.getElementById('reg-stock').value = '';
}

async function guardarProductoBD() {
    const nombre = document.getElementById('reg-nombre').value.trim();
    const precio = parseFloat(document.getElementById('reg-precio').value);
    const stock = parseInt(document.getElementById('reg-stock').value);

    if (!nombre || isNaN(precio) || isNaN(stock)) {
        return alert("Por favor, llena todos los campos correctamente.");
    }

    // Generamos un ID manual porque tu tabla usa Varchar (Ej: P-842)
    const idManual = "P-" + Math.floor(Math.random() * 999);

    try {
        const { data, error } = await supabaseClient
            .from('producto')
            .insert([{ 
                id_producto: idManual, // <-- IMPORTANTE: Enviamos el ID
                nombre: nombre, 
                precio: precio, 
                cant_exist: stock 
            }])
            .select();

        if (error) throw error;

        alert("Producto registrado exitosamente con ID: " + idManual);
        cerrarModalProducto();
        irAProductos(); 

    } catch (err) {
        console.error(err);
        alert("Error al guardar: " + err.message);
    }
}

async function irAReportes() {
    const main = document.getElementById('main-content');
    const { data, error } = await supabaseClient.from('ventas').select('*');

    main.innerHTML = `
        <div style="background:white; padding:30px; border-radius:12px;">
            <h2>Historial de Ventas (Reporte General)</h2>
            <table style="width:100%; margin-top:20px;">
                <thead>
                    <tr style="text-align:left; border-bottom:2px solid #eee;">
                        <th>ID Venta</th>
                        <th>Fecha</th>
                        <th>Total</th>
                        <th>Trabajador</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(v => `
                        <tr>
                            <td>#${v.id_venta}</td>
                            <td>${new Date(v.fecha).toLocaleDateString()}</td>
                            <td>$${v.precio_total}</td>
                            <td>${v.curp_trabajador}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}
