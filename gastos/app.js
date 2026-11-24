(function () {
    'use strict';

    // ---------- Configuración ----------
    const STORAGE_KEY = 'misFinanzas.v1';

    const CATEGORIAS = {
        ingreso: [
            { id: 'sueldo', nombre: 'Sueldo', icono: '💼', color: '#2f9e44' },
            { id: 'extra', nombre: 'Ingreso extra', icono: '✨', color: '#37b24d' },
            { id: 'freelance', nombre: 'Trabajo independiente', icono: '🧑‍💻', color: '#40c057' },
            { id: 'venta', nombre: 'Venta', icono: '🏷️', color: '#51cf66' },
            { id: 'regalo', nombre: 'Regalo', icono: '🎁', color: '#69db7c' },
            { id: 'otro_ingreso', nombre: 'Otro ingreso', icono: '➕', color: '#8ce99a' }
        ],
        gasto: [
            { id: 'vivienda', nombre: 'Vivienda', icono: '🏠', color: '#4263eb' },
            { id: 'alimentacion', nombre: 'Alimentación', icono: '🛒', color: '#f08c00' },
            { id: 'transporte', nombre: 'Transporte', icono: '🚌', color: '#1098ad' },
            { id: 'servicios', nombre: 'Servicios (luz, agua, internet)', icono: '💡', color: '#7048e8' },
            { id: 'salud', nombre: 'Salud', icono: '🩺', color: '#e64980' },
            { id: 'educacion', nombre: 'Educación', icono: '📚', color: '#0ca678' },
            { id: 'ocio', nombre: 'Ocio', icono: '🎬', color: '#f76707' },
            { id: 'restaurantes', nombre: 'Restaurantes', icono: '🍽️', color: '#d6336c' },
            { id: 'ropa', nombre: 'Ropa', icono: '👕', color: '#ae3ec9' },
            { id: 'suscripciones', nombre: 'Suscripciones', icono: '📺', color: '#1c7ed6' },
            { id: 'deudas', nombre: 'Deudas / Tarjetas', icono: '💳', color: '#c92a2a' },
            { id: 'ahorro', nombre: 'Ahorro / Inversión', icono: '🐷', color: '#2b8a3e' },
            { id: 'otros', nombre: 'Otros', icono: '📦', color: '#868e96' }
        ]
    };

    // ---------- Estado ----------
    const hoy = new Date();
    let state = cargar();
    let mesActual = { y: hoy.getFullYear(), m: hoy.getMonth() }; // m: 0-11
    let tipoForm = 'gasto';

    function cargar() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const data = JSON.parse(raw);
                if (data && Array.isArray(data.movimientos)) {
                    return { moneda: data.moneda || 'EUR', movimientos: data.movimientos };
                }
            }
        } catch (e) { /* almacenamiento no disponible */ }
        return { moneda: 'EUR', movimientos: [] };
    }

    function guardar() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            toast('No se pudo guardar en este navegador.');
        }
    }

    // ---------- Utilidades ----------
    const $ = (id) => document.getElementById(id);

    function uid() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }

    function formatoMoneda(n) {
        try {
            return new Intl.NumberFormat('es', { style: 'currency', currency: state.moneda }).format(n);
        } catch (e) {
            return n.toFixed(2);
        }
    }

    function claveMes(y, m) {
        return y + '-' + String(m + 1).padStart(2, '0');
    }

    function nombreMes(y, m, corto) {
        const d = new Date(y, m, 1);
        const txt = d.toLocaleDateString('es', corto ? { month: 'short' } : { month: 'long', year: 'numeric' });
        return txt.charAt(0).toUpperCase() + txt.slice(1);
    }

    function fechaISO(d) {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function fechaLegible(iso) {
        const [y, m, d] = iso.split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' });
    }

    function buscarCategoria(tipo, id) {
        return CATEGORIAS[tipo].find((c) => c.id === id) || { id: id, nombre: id, icono: '•', color: '#868e96' };
    }

    function movimientosDelMes(y, m) {
        const k = claveMes(y, m);
        return state.movimientos.filter((t) => t.fecha.slice(0, 7) === k);
    }

    function sumar(lista, tipo) {
        return lista.filter((t) => t.tipo === tipo).reduce((acc, t) => acc + t.monto, 0);
    }

    function desplazarMes(y, m, delta) {
        const d = new Date(y, m + delta, 1);
        return { y: d.getFullYear(), m: d.getMonth() };
    }

    function claveFijo(t) {
        return t.tipo + '|' + t.categoria + '|' + (t.descripcion || '').trim().toLowerCase();
    }

    // Confirmación propia (los diálogos del navegador pueden estar bloqueados)
    function confirmar(mensaje, textoOk) {
        return new Promise((resolve) => {
            const modal = $('confirmModal');
            const ok = $('confirmOk');
            const cancel = $('confirmCancel');
            $('confirmText').textContent = mensaje;
            ok.textContent = textoOk || 'Aceptar';
            modal.classList.remove('hidden');
            ok.focus();
            const cerrar = (valor) => {
                modal.classList.add('hidden');
                ok.removeEventListener('click', onOk);
                cancel.removeEventListener('click', onCancel);
                modal.removeEventListener('click', onFondo);
                document.removeEventListener('keydown', onKey);
                resolve(valor);
            };
            const onOk = () => cerrar(true);
            const onCancel = () => cerrar(false);
            const onFondo = (e) => { if (e.target === modal) cerrar(false); };
            const onKey = (e) => { if (e.key === 'Escape') cerrar(false); };
            ok.addEventListener('click', onOk);
            cancel.addEventListener('click', onCancel);
            modal.addEventListener('click', onFondo);
            document.addEventListener('keydown', onKey);
        });
    }

    let toastTimer;
    function toast(msg) {
        const el = $('toast');
        el.textContent = msg;
        el.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
    }

    // ---------- Formulario ----------
    function poblarCategorias() {
        const sel = $('categoria');
        sel.innerHTML = '';
        CATEGORIAS[tipoForm].forEach((c) => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.icono + '  ' + c.nombre;
            sel.appendChild(opt);
        });
    }

    function setTipoForm(tipo) {
        tipoForm = tipo;
        document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tipo === tipo));
        poblarCategorias();
        actualizarBotonSubmit();
    }

    function actualizarBotonSubmit() {
        const editando = !!$('editId').value;
        const txt = tipoForm === 'gasto' ? 'gasto' : 'ingreso';
        $('submitBtn').textContent = (editando ? 'Guardar ' : 'Agregar ') + txt;
        $('cancelEdit').classList.toggle('hidden', !editando);
    }

    function fechaPorDefecto() {
        // Si estás viendo el mes actual usa hoy; si no, el día 1 de ese mes.
        if (mesActual.y === hoy.getFullYear() && mesActual.m === hoy.getMonth()) return fechaISO(hoy);
        return fechaISO(new Date(mesActual.y, mesActual.m, 1));
    }

    function limpiarForm() {
        $('form').reset();
        $('editId').value = '';
        $('fecha').value = fechaPorDefecto();
        actualizarBotonSubmit();
    }

    function onSubmit(e) {
        e.preventDefault();
        const monto = Math.round(parseFloat($('monto').value) * 100) / 100;
        if (!(monto > 0)) {
            toast('Introduce un monto mayor que 0.');
            return;
        }
        const fecha = $('fecha').value;
        if (!fecha) {
            toast('Selecciona una fecha.');
            return;
        }
        const datos = {
            tipo: tipoForm,
            categoria: $('categoria').value,
            descripcion: $('descripcion').value.trim(),
            monto: monto,
            fecha: fecha,
            fijo: $('fijo').checked
        };

        const editId = $('editId').value;
        if (editId) {
            const t = state.movimientos.find((x) => x.id === editId);
            if (t) Object.assign(t, datos);
            toast('Movimiento actualizado.');
        } else {
            state.movimientos.push(Object.assign({ id: uid() }, datos));
            toast((tipoForm === 'gasto' ? 'Gasto' : 'Ingreso') + ' agregado.');
        }
        guardar();

        // Saltar al mes del movimiento si es otro
        const [y, m] = fecha.split('-').map(Number);
        mesActual = { y: y, m: m - 1 };
        limpiarForm();
        render();
    }

    function editar(id) {
        const t = state.movimientos.find((x) => x.id === id);
        if (!t) return;
        setTipoForm(t.tipo);
        $('editId').value = t.id;
        $('monto').value = t.monto;
        $('categoria').value = t.categoria;
        $('descripcion').value = t.descripcion || '';
        $('fecha').value = t.fecha;
        $('fijo').checked = !!t.fijo;
        actualizarBotonSubmit();
        $('form').scrollIntoView({ behavior: 'smooth', block: 'center' });
        $('monto').focus({ preventScroll: true });
    }

    async function eliminar(id) {
        const t = state.movimientos.find((x) => x.id === id);
        if (!t) return;
        const nombre = t.descripcion || buscarCategoria(t.tipo, t.categoria).nombre;
        if (!(await confirmar('¿Eliminar "' + nombre + '" (' + formatoMoneda(t.monto) + ')?', 'Eliminar'))) return;
        state.movimientos = state.movimientos.filter((x) => x.id !== id);
        if ($('editId').value === id) limpiarForm();
        guardar();
        render();
        toast('Movimiento eliminado.');
    }

    // ---------- Fijos del mes anterior ----------
    function fijosPendientes() {
        const prev = desplazarMes(mesActual.y, mesActual.m, -1);
        const actuales = new Set(movimientosDelMes(mesActual.y, mesActual.m).map(claveFijo));
        const vistos = new Set();
        return movimientosDelMes(prev.y, prev.m).filter((t) => {
            if (!t.fijo) return false;
            const k = claveFijo(t);
            if (actuales.has(k) || vistos.has(k)) return false;
            vistos.add(k);
            return true;
        });
    }

    function copiarFijos() {
        const pendientes = fijosPendientes();
        const diasMes = new Date(mesActual.y, mesActual.m + 1, 0).getDate();
        pendientes.forEach((t) => {
            const dia = Math.min(Number(t.fecha.slice(8, 10)), diasMes);
            state.movimientos.push({
                id: uid(),
                tipo: t.tipo,
                categoria: t.categoria,
                descripcion: t.descripcion,
                monto: t.monto,
                fecha: fechaISO(new Date(mesActual.y, mesActual.m, dia)),
                fijo: true
            });
        });
        guardar();
        render();
        toast(pendientes.length + ' movimiento(s) fijo(s) agregado(s).');
    }

    // ---------- Render ----------
    function render() {
        const lista = movimientosDelMes(mesActual.y, mesActual.m);
        $('monthLabel').textContent = nombreMes(mesActual.y, mesActual.m);

        renderResumen(lista);
        renderCategorias(lista);
        renderMovimientos(lista);
        renderFijos();
        renderHistorial();
    }

    function renderResumen(lista) {
        const ingresos = sumar(lista, 'ingreso');
        const gastos = sumar(lista, 'gasto');
        const balance = ingresos - gastos;

        const sueldo = lista.filter((t) => t.tipo === 'ingreso' && t.categoria === 'sueldo').reduce((a, t) => a + t.monto, 0);
        const extras = ingresos - sueldo;

        $('totalIngresos').textContent = formatoMoneda(ingresos);
        $('detalleIngresos').textContent = ingresos
            ? 'Sueldo ' + formatoMoneda(sueldo) + ' · Extras ' + formatoMoneda(extras)
            : 'Agrega tu sueldo e ingresos extra';

        const nGastos = lista.filter((t) => t.tipo === 'gasto').length;
        $('totalGastos').textContent = formatoMoneda(gastos);
        $('detalleGastos').textContent = nGastos + (nGastos === 1 ? ' gasto registrado' : ' gastos registrados');

        const elBal = $('balance');
        elBal.textContent = formatoMoneda(balance);
        elBal.classList.toggle('positive', balance > 0);
        elBal.classList.toggle('negative', balance < 0);

        const ahorroPct = ingresos > 0 ? Math.round((balance / ingresos) * 100) : 0;
        $('detalleBalance').textContent = ingresos > 0
            ? (balance >= 0 ? 'Ahorras el ' + ahorroPct + '% de tus ingresos' : 'Gastas más de lo que ingresas')
            : '';

        const pct = ingresos > 0 ? (gastos / ingresos) * 100 : (gastos > 0 ? 100 : 0);
        $('pctGastado').textContent = ingresos > 0 ? Math.round(pct) + '%' : (gastos > 0 ? '—' : '0%');
        const bar = $('progressBar');
        bar.style.width = Math.min(pct, 100) + '%';
        bar.classList.toggle('warn', pct >= 80 && pct <= 100);
        bar.classList.toggle('over', pct > 100);
        $('disponible').textContent = balance >= 0
            ? 'Te quedan ' + formatoMoneda(balance)
            : 'Te has pasado ' + formatoMoneda(-balance);
    }

    function renderCategorias(lista) {
        const ul = $('catList');
        ul.innerHTML = '';
        const gastos = lista.filter((t) => t.tipo === 'gasto');
        const total = gastos.reduce((a, t) => a + t.monto, 0);
        $('catEmpty').classList.toggle('hidden', gastos.length > 0);
        if (!gastos.length) return;

        const porCat = {};
        gastos.forEach((t) => { porCat[t.categoria] = (porCat[t.categoria] || 0) + t.monto; });

        Object.entries(porCat)
            .sort((a, b) => b[1] - a[1])
            .forEach(([id, monto]) => {
                const c = buscarCategoria('gasto', id);
                const pct = total ? (monto / total) * 100 : 0;
                const li = document.createElement('li');

                const row = document.createElement('div');
                row.className = 'cat-item__row';
                const nombre = document.createElement('span');
                nombre.textContent = c.icono + ' ' + c.nombre;
                const amt = document.createElement('span');
                amt.className = 'cat-item__amount';
                amt.textContent = formatoMoneda(monto) + ' · ' + Math.round(pct) + '%';
                row.append(nombre, amt);

                const bar = document.createElement('div');
                bar.className = 'cat-bar';
                const fill = document.createElement('span');
                fill.style.width = pct + '%';
                fill.style.background = c.color;
                bar.appendChild(fill);

                li.append(row, bar);
                ul.appendChild(li);
            });
    }

    function renderMovimientos(lista) {
        const ul = $('txList');
        ul.innerHTML = '';
        const filtro = $('filtroTipo').value;
        const q = $('buscar').value.trim().toLowerCase();

        const visibles = lista
            .filter((t) => filtro === 'todos' || t.tipo === filtro)
            .filter((t) => {
                if (!q) return true;
                const c = buscarCategoria(t.tipo, t.categoria);
                return (t.descripcion || '').toLowerCase().includes(q) || c.nombre.toLowerCase().includes(q);
            })
            .sort((a, b) => (b.fecha.localeCompare(a.fecha)) || (a.tipo === 'ingreso' ? -1 : 1));

        $('txEmpty').textContent = lista.length ? 'Ningún movimiento coincide con el filtro.' : 'No hay movimientos en este mes.';
        $('txEmpty').classList.toggle('hidden', visibles.length > 0);

        visibles.forEach((t) => {
            const c = buscarCategoria(t.tipo, t.categoria);
            const li = document.createElement('li');
            li.className = 'tx';

            const icon = document.createElement('div');
            icon.className = 'tx__icon';
            icon.textContent = c.icono;

            const main = document.createElement('div');
            main.className = 'tx__main';
            const title = document.createElement('div');
            title.className = 'tx__title';
            title.textContent = t.descripcion || c.nombre;
            if (t.fijo) {
                const badge = document.createElement('span');
                badge.className = 'tx__badge';
                badge.textContent = 'fijo';
                title.appendChild(badge);
            }
            const meta = document.createElement('div');
            meta.className = 'tx__meta';
            meta.textContent = c.nombre + ' · ' + fechaLegible(t.fecha);
            main.append(title, meta);

            const amount = document.createElement('div');
            amount.className = 'tx__amount ' + (t.tipo === 'ingreso' ? 'positive' : 'negative');
            amount.textContent = (t.tipo === 'ingreso' ? '+' : '−') + formatoMoneda(t.monto);

            const actions = document.createElement('div');
            actions.className = 'tx__actions';
            const bEdit = document.createElement('button');
            bEdit.type = 'button';
            bEdit.title = 'Editar';
            bEdit.setAttribute('aria-label', 'Editar');
            bEdit.textContent = '✎';
            bEdit.addEventListener('click', () => editar(t.id));
            const bDel = document.createElement('button');
            bDel.type = 'button';
            bDel.title = 'Eliminar';
            bDel.setAttribute('aria-label', 'Eliminar');
            bDel.textContent = '🗑';
            bDel.addEventListener('click', () => eliminar(t.id));
            actions.append(bEdit, bDel);

            li.append(icon, main, amount, actions);
            ul.appendChild(li);
        });
    }

    function renderFijos() {
        const pendientes = fijosPendientes();
        const banner = $('fixedBanner');
        banner.classList.toggle('hidden', pendientes.length === 0);
        if (!pendientes.length) return;
        const total = pendientes.reduce((a, t) => a + (t.tipo === 'ingreso' ? t.monto : -t.monto), 0);
        $('fixedBannerText').textContent = 'Tienes ' + pendientes.length + ' movimiento(s) fijo(s) del mes anterior sin agregar (' +
            (total >= 0 ? '+' : '−') + formatoMoneda(Math.abs(total)) + ').';
    }

    function renderHistorial() {
        const cont = $('history');
        cont.innerHTML = '';
        const meses = [];
        for (let i = 5; i >= 0; i--) {
            const p = desplazarMes(mesActual.y, mesActual.m, -i);
            const l = movimientosDelMes(p.y, p.m);
            meses.push({ y: p.y, m: p.m, ing: sumar(l, 'ingreso'), gas: sumar(l, 'gasto') });
        }
        const max = Math.max(1, ...meses.map((x) => Math.max(x.ing, x.gas)));

        meses.forEach((x, i) => {
            const col = document.createElement('div');
            col.className = 'history__col' + (i === 5 ? ' current' : '');
            col.title = nombreMes(x.y, x.m) + '\nIngresos: ' + formatoMoneda(x.ing) + '\nGastos: ' + formatoMoneda(x.gas);
            col.addEventListener('click', () => { mesActual = { y: x.y, m: x.m }; limpiarForm(); render(); });

            const bars = document.createElement('div');
            bars.className = 'history__bars';
            const bIn = document.createElement('div');
            bIn.className = 'history__bar history__bar--in';
            bIn.style.height = (x.ing / max) * 100 + '%';
            const bOut = document.createElement('div');
            bOut.className = 'history__bar history__bar--out';
            bOut.style.height = (x.gas / max) * 100 + '%';
            bars.append(bIn, bOut);

            const label = document.createElement('span');
            label.className = 'history__label';
            label.textContent = nombreMes(x.y, x.m, true).replace('.', '');

            col.append(bars, label);
            cont.appendChild(col);
        });
    }

    // ---------- Exportar / importar ----------
    function descargar(nombre, contenido, tipo) {
        const blob = new Blob([contenido], { type: tipo });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombre;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function exportarCSV() {
        if (!state.movimientos.length) { toast('No hay datos para exportar.'); return; }
        const esc = (v) => '"' + String(v).replace(/"/g, '""') + '"';
        const filas = [['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto', 'Fijo']];
        state.movimientos
            .slice()
            .sort((a, b) => a.fecha.localeCompare(b.fecha))
            .forEach((t) => {
                filas.push([
                    t.fecha,
                    t.tipo === 'ingreso' ? 'Ingreso' : 'Gasto',
                    buscarCategoria(t.tipo, t.categoria).nombre,
                    t.descripcion || '',
                    (t.tipo === 'ingreso' ? t.monto : -t.monto).toFixed(2),
                    t.fijo ? 'Sí' : 'No'
                ]);
            });
        const csv = '﻿' + filas.map((f) => f.map(esc).join(';')).join('\r\n');
        descargar('mis-finanzas-' + fechaISO(new Date()) + '.csv', csv, 'text/csv;charset=utf-8');
    }

    function exportarJSON() {
        descargar('mis-finanzas-copia-' + fechaISO(new Date()) + '.json', JSON.stringify(state, null, 2), 'application/json');
    }

    function importarJSON(file) {
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const data = JSON.parse(reader.result);
                if (!data || !Array.isArray(data.movimientos)) throw new Error('formato');
                const validos = data.movimientos.filter((t) =>
                    t && (t.tipo === 'ingreso' || t.tipo === 'gasto') &&
                    typeof t.monto === 'number' && t.monto > 0 &&
                    typeof t.fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t.fecha) &&
                    typeof t.categoria === 'string'
                ).map((t) => ({
                    id: typeof t.id === 'string' ? t.id : uid(),
                    tipo: t.tipo,
                    categoria: t.categoria,
                    descripcion: typeof t.descripcion === 'string' ? t.descripcion.slice(0, 80) : '',
                    monto: t.monto,
                    fecha: t.fecha,
                    fijo: !!t.fijo
                }));
                if (!(await confirmar('Se reemplazarán tus datos actuales por ' + validos.length + ' movimientos de la copia. ¿Continuar?', 'Restaurar'))) return;
                state = { moneda: typeof data.moneda === 'string' ? data.moneda : state.moneda, movimientos: validos };
                $('moneda').value = state.moneda;
                guardar();
                render();
                toast('Copia restaurada.');
            } catch (e) {
                toast('El archivo no es una copia válida.');
            }
        };
        reader.readAsText(file);
    }

    // ---------- Eventos ----------
    function init() {
        $('moneda').value = state.moneda;
        if ($('moneda').value !== state.moneda) $('moneda').value = 'EUR';
        setTipoForm('gasto');
        limpiarForm();

        document.querySelectorAll('.tab').forEach((b) =>
            b.addEventListener('click', () => {
                if ($('editId').value) limpiarForm();
                setTipoForm(b.dataset.tipo);
            })
        );
        $('form').addEventListener('submit', onSubmit);
        $('cancelEdit').addEventListener('click', limpiarForm);

        $('prevMonth').addEventListener('click', () => { mesActual = desplazarMes(mesActual.y, mesActual.m, -1); limpiarForm(); render(); });
        $('nextMonth').addEventListener('click', () => { mesActual = desplazarMes(mesActual.y, mesActual.m, 1); limpiarForm(); render(); });

        $('filtroTipo').addEventListener('change', render);
        $('buscar').addEventListener('input', render);
        $('copyFixed').addEventListener('click', copiarFijos);

        $('moneda').addEventListener('change', (e) => { state.moneda = e.target.value; guardar(); render(); });
        $('exportCsv').addEventListener('click', exportarCSV);
        $('exportJson').addEventListener('click', exportarJSON);
        $('importJson').addEventListener('change', (e) => {
            if (e.target.files[0]) importarJSON(e.target.files[0]);
            e.target.value = '';
        });
        $('resetAll').addEventListener('click', async () => {
            if (!state.movimientos.length) { toast('No hay datos que borrar.'); return; }
            if (!(await confirmar('¿Seguro que quieres borrar TODOS tus movimientos? Esta acción no se puede deshacer.', 'Borrar todo'))) return;
            state.movimientos = [];
            guardar();
            limpiarForm();
            render();
            toast('Datos borrados.');
        });

        render();
    }

    init();
})();
