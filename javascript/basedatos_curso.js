document.addEventListener('DOMContentLoaded', () => {
    // --- 1. CONFIGURACIÓN INICIAL ---
    const fs = require('fs');
    const path = require('path');

    const params = new URLSearchParams(window.location.search);
    const cursoNombre = params.get('curso');

    if (!cursoNombre) {
        alert("Error: No se ha especificado un curso.");
        return;
    }

    const CURSO_FILE = path.join(process.cwd(), 'cursos', cursoNombre, 'curso.json');

    // Referencias a los elementos del DOM
    const denominacionInput = document.getElementById('cursoDenominacion');
    const carpetaInput = document.getElementById('cursoCarpeta');
    const centroInput = document.getElementById('cursoCentro');
    const inicioInput = document.getElementById('cursoInicio');
    const finInput = document.getElementById('cursoFin');
    
    const vacacionesTbody = document.querySelector('.sub-section:first-child .data-table tbody');
    const festivosTbody = document.querySelector('.sub-section:last-child .data-table tbody');
    const calendarGrid = document.getElementById('calendar-grid');

    const btnAddVacacion = document.getElementById('btnAddVacacion');
    const btnAddFestivo = document.getElementById('btnAddFestivo');

    let cursoData = {};

    function cargarYRenderizarCurso() {
        try {
            const data = fs.readFileSync(CURSO_FILE, 'utf-8');
            cursoData = JSON.parse(data);
        } catch (error) {
            console.error("Error al leer o parsear el archivo curso.json:", error);
            alert("No se pudieron cargar los datos del curso.");
            return;
        }
        refrescarTodaLaUI();
    }

    // --- 2. FUNCIONES DE RENDERIZADO Y GUARDADO ---

    function refrescarTodaLaUI() {
        const validationResults = validarFechas(cursoData.fechas);
        const mapaEventos = crearMapaDeEventos(cursoData.fechas);

        renderDatosGenerales(cursoData.datos);
        renderFechasPrincipales(cursoData.fechas);
        renderTablaVacaciones(cursoData.fechas.periodos_vacacionales, validationResults.invalidPeriodIndices);
        renderTablaFestivos(cursoData.fechas.dias_festivos, validationResults.invalidFestivoIndices);
        renderCalendarioAnual(cursoData.fechas.curso_inicio, cursoData.fechas.curso_fin, mapaEventos);
    }
    
    function guardarDatos() {
        try {
            fs.writeFileSync(CURSO_FILE, JSON.stringify(cursoData, null, 2), 'utf-8');
        } catch (error) {
            console.error("Error al guardar el archivo curso.json:", error);
            alert("No se pudieron guardar los cambios.");
        }
    }

    function renderDatosGenerales(datos) {
        denominacionInput.value = datos.denominacion || '';
        carpetaInput.value = datos.carpeta || '';
        centroInput.value = datos.centro_educativo || '';
    }
    
    function renderFechasPrincipales(fechas) {
        inicioInput.value = convertirFechaParaInput(fechas.curso_inicio);
        finInput.value = convertirFechaParaInput(fechas.curso_fin);
    }

    function renderTablaVacaciones(periodos = [], invalidIndices = []) {
        vacacionesTbody.innerHTML = '';
        periodos.forEach((p, index) => {
            const tr = document.createElement('tr');
            if (invalidIndices.includes(index)) {
                tr.classList.add('fila-invalida');
            }
            tr.innerHTML = `
                <td><input type="text" data-index="${index}" data-field="nombre" value="${p.nombre || ''}"></td>
                <td><input type="color" data-index="${index}" data-field="color" value="${p.color || '#ffffff'}"></td>
                <td><input type="date" data-index="${index}" data-field="fecha_inicio" value="${convertirFechaParaInput(p.fecha_inicio)}"></td>
                <td><input type="date" data-index="${index}" data-field="fecha_fin" value="${convertirFechaParaInput(p.fecha_fin)}"></td>
                <td class="acciones"><button class="btn-delete" data-index="${index}"><svg style="vertical-align:middle" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg></button></td>
            `;
            vacacionesTbody.appendChild(tr);
        });
    }

    function renderTablaFestivos(festivos = [], invalidIndices = []) {
        festivosTbody.innerHTML = '';
        festivos.forEach((f, index) => {
            const tr = document.createElement('tr');
            if (invalidIndices.includes(index)) {
                tr.classList.add('fila-invalida');
            }
            tr.innerHTML = `
                <td><input type="text" data-index="${index}" data-field="nombre" value="${f.nombre || ''}"></td>
                <td><input type="color" data-index="${index}" data-field="color" value="${f.color || '#ffffff'}"></td>
                <td><input type="date" data-index="${index}" data-field="fecha" value="${convertirFechaParaInput(f.fecha)}"></td>
                <td class="acciones"><button class="btn-delete" data-index="${index}"><svg style="vertical-align:middle" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg></button></td>
            `;
            festivosTbody.appendChild(tr);
        });
    }
    
    function renderCalendarioAnual(inicio, fin, mapaEventos = {}) {
        calendarGrid.innerHTML = '';
        const fechaInicio = parsearFecha(inicio);
        const fechaFin = parsearFecha(fin);
        if (!fechaInicio || !fechaFin) return;
        let fechaActual = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth(), 1);
        while (fechaActual <= fechaFin) {
            const monthHtml = generarHTMLMes(fechaActual.getFullYear(), fechaActual.getMonth(), mapaEventos);
            calendarGrid.innerHTML += monthHtml;
            fechaActual.setMonth(fechaActual.getMonth() + 1);
        }
        inicializarTooltipsDelCalendario();
    }
    
    // --- 3. LÓGICA DE EVENTOS ---

    function inicializarListenersDeGuardado() {
 
        // Inputs de Datos Generales
        denominacionInput.addEventListener('input', (e) => {
            const nuevoValor = e.target.value;
            cursoData.datos.denominacion = nuevoValor;
            guardarDatos();
            // Actualiza la barra superior en tiempo real
            document.getElementById('info-curso-denominacion').textContent = nuevoValor;
        });

        centroInput.addEventListener('input', (e) => {
            const nuevoValor = e.target.value;
            cursoData.datos.centro_educativo = nuevoValor;
            guardarDatos();
            // Actualiza la barra superior en tiempo real
            document.getElementById('info-curso-centro').textContent = nuevoValor;
        });
  
        // Inputs de Fechas Principales
        inicioInput.addEventListener('change', (e) => {
            cursoData.fechas.curso_inicio = convertirFechaParaJSON(e.target.value);
            guardarDatos();
            refrescarTodaLaUI();
        });
        finInput.addEventListener('change', (e) => {
            cursoData.fechas.curso_fin = convertirFechaParaJSON(e.target.value);
            guardarDatos();
            refrescarTodaLaUI();
        });

        // Inputs en la tabla de Periodos Vacacionales
        vacacionesTbody.addEventListener('change', (e) => {
            if (e.target.tagName === 'INPUT') {
                const index = e.target.dataset.index;
                const field = e.target.dataset.field;
                let value = e.target.value;
                if (e.target.type === 'date') value = convertirFechaParaJSON(value);
                
                cursoData.fechas.periodos_vacacionales[index][field] = value;
                guardarDatos();
                refrescarTodaLaUI();
            }
        });
        
        // Inputs en la tabla de Días Festivos
        festivosTbody.addEventListener('change', (e) => {
            if (e.target.tagName === 'INPUT') {
                const index = e.target.dataset.index;
                const field = e.target.dataset.field;
                let value = e.target.value;
                if (e.target.type === 'date') value = convertirFechaParaJSON(value);
                
                cursoData.fechas.dias_festivos[index][field] = value;
                guardarDatos();
                refrescarTodaLaUI();
            }
        });
    }

    btnAddVacacion.addEventListener('click', () => {
        const nuevoPeriodo = { nombre: "", fecha_inicio: "", fecha_fin: "", color: "#ff0000" };
        if (!cursoData.fechas.periodos_vacacionales) cursoData.fechas.periodos_vacacionales = [];
        cursoData.fechas.periodos_vacacionales.push(nuevoPeriodo);
        guardarDatos();
        refrescarTodaLaUI();
    });

    btnAddFestivo.addEventListener('click', () => {
        const nuevoFestivo = { nombre: "", fecha: "", color: "#00ff00" };
        if (!cursoData.fechas.dias_festivos) cursoData.fechas.dias_festivos = [];
        cursoData.fechas.dias_festivos.push(nuevoFestivo);
        guardarDatos();
        refrescarTodaLaUI();
    });

    vacacionesTbody.addEventListener('click', (e) => {
        const deleteButton = e.target.closest('button.btn-delete');
        if (deleteButton) {
            const index = deleteButton.dataset.index;
            cursoData.fechas.periodos_vacacionales.splice(index, 1);
            guardarDatos();
            refrescarTodaLaUI();
        }
    });

    festivosTbody.addEventListener('click', (e) => {
        const deleteButton = e.target.closest('button.btn-delete');
        if (deleteButton) {
            const index = deleteButton.dataset.index;
            cursoData.fechas.dias_festivos.splice(index, 1);
            guardarDatos();
            refrescarTodaLaUI();
        }
    });

    // --- 4. FUNCIONES AUXILIARES ---

    /**
     * Revisa todas las fechas y devuelve los índices de las filas con errores.
     */
    function validarFechas(fechas) {
        const invalidPeriodIndices = new Set();
        const invalidFestivoIndices = new Set();

        const cursoInicio = parsearFecha(fechas.curso_inicio);
        const cursoFin = parsearFecha(fechas.curso_fin);
        const periodos = fechas.periodos_vacacionales || [];
        const festivos = fechas.dias_festivos || [];

        // 1. Validar Periodos Vacacionales
        periodos.forEach((p, i) => {
            const pInicio = parsearFecha(p.fecha_inicio);
            const pFin = parsearFecha(p.fecha_fin);

            // A. Faltan datos
            if (!p.nombre || !pInicio || !pFin) {
                invalidPeriodIndices.add(i);
                return; // No podemos seguir validando si faltan fechas
            }

            // **NUEVO**: Comprobar que la fecha de fin sea posterior a la de inicio
            if (pFin <= pInicio) {
                invalidPeriodIndices.add(i);
            }

            // B. Fuera de los límites del curso
            if (cursoInicio && cursoFin && (pFin < cursoInicio || pInicio > cursoFin)) {
                invalidPeriodIndices.add(i);
            }

            // C. Superposición con otros periodos
            periodos.forEach((otroP, j) => {
                if (i >= j) return; // Comparamos cada par una sola vez
                const otroPInicio = parsearFecha(otroP.fecha_inicio);
                const otroPFin = parsearFecha(otroP.fecha_fin);
                if (!otroPInicio || !otroPFin) return;
                // Condición de solapamiento: (InicioA <= FinB) y (FinA >= InicioB)
                if (pInicio <= otroPFin && pFin >= otroPInicio) {
                    invalidPeriodIndices.add(i);
                    invalidPeriodIndices.add(j);
                }
            });
        });

        // 2. Validar Días Festivos
        festivos.forEach((f, i) => {
            const fFecha = parsearFecha(f.fecha);
            
            // A. Faltan datos
            if (!f.nombre || !fFecha) {
                invalidFestivoIndices.add(i);
                return;
            }
            // B. Fuera de los límites del curso
            if (cursoInicio && cursoFin && (fFecha < cursoInicio || fFecha > cursoFin)) {
                invalidFestivoIndices.add(i);
            }
            // D. Superposición con otros festivos o periodos
            festivos.forEach((otroF, j) => {
                if (i >= j) return;
                const otroFFecha = parsearFecha(otroF.fecha);
                if (fFecha && otroFFecha && fFecha.getTime() === otroFFecha.getTime()) {
                    invalidFestivoIndices.add(i);
                    invalidFestivoIndices.add(j);
                }
            });
            periodos.forEach(p => {
                const pInicio = parsearFecha(p.fecha_inicio);
                const pFin = parsearFecha(p.fecha_fin);
                if (pInicio && pFin && fFecha >= pInicio && fFecha <= pFin) {
                    invalidFestivoIndices.add(i);
                }
            });
        });

        return {
            invalidPeriodIndices: Array.from(invalidPeriodIndices),
            invalidFestivoIndices: Array.from(invalidFestivoIndices)
        };
    }
    
    function convertirFechaParaInput(fechaStr) {
        if (!fechaStr || typeof fechaStr !== 'string') return '';
        const parts = fechaStr.split('/');
        if (parts.length !== 3) return '';
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    
    function convertirFechaParaJSON(fechaYMD) {
        if (!fechaYMD) return "";
        const parts = fechaYMD.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    function parsearFecha(fechaStr) {
        if (!fechaStr) return null;
        const parts = fechaStr.split('/');
        if (parts.length !== 3) return null;
        return new Date(parts[2], parts[1] - 1, parts[0]);
    }

    function crearMapaDeEventos(fechas) {
        const mapa = {};
        const agregarEvento = (key, evento) => { mapa[key] = { ...mapa[key], ...evento }; };
        (fechas.periodos_vacacionales || []).forEach(p => {
            if (!p.fecha_inicio || !p.fecha_fin || !p.color) return;
            let fechaActual = parsearFecha(p.fecha_inicio);
            const fechaFin = parsearFecha(p.fecha_fin);
            while (fechaActual && fechaFin && fechaActual <= fechaFin) {
                const key = toKey(fechaActual);
                agregarEvento(key, { tipo: 'periodo', ...p });
                fechaActual.setDate(fechaActual.getDate() + 1);
            }
        });
        (fechas.dias_festivos || []).forEach(f => {
            if (!f.fecha || !f.color) return;
            agregarEvento(toKey(parsearFecha(f.fecha)), { tipo: 'festivo', ...f });
        });
        const fechaInicioCurso = parsearFecha(fechas.curso_inicio);
        const fechaFinCurso = parsearFecha(fechas.curso_fin);
        if (fechaInicioCurso) agregarEvento(toKey(fechaInicioCurso), { tipo: 'clave', nombre: 'Inicio de Curso' });
        if (fechaFinCurso) agregarEvento(toKey(fechaFinCurso), { tipo: 'clave', nombre: 'Fin de Curso' });
        return mapa;
    }

    function generarHTMLMes(year, month, mapaEventos) {
        const meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
        const primerDia = new Date(year, month, 1);
        const diasEnMes = new Date(year, month + 1, 0).getDate();
        let diaSemanaInicio = primerDia.getDay();
        if (diaSemanaInicio === 0) diaSemanaInicio = 7;
        const offset = diaSemanaInicio - 1;
        let diasHtml = '';
        for (let i = 0; i < offset; i++) { diasHtml += `<div></div>`; }
        for (let dia = 1; dia <= diasEnMes; dia++) {
            const fechaActualDia = new Date(year, month, dia);
            const fechaKey = toKey(fechaActualDia);
            const evento = mapaEventos[fechaKey];
            let clasesExtra = (fechaActualDia.getDay() === 0 || fechaActualDia.getDay() === 6) ? 'weekend' : '';
            let estiloExtra = '';
            let tooltipHtml = '';
            if (evento) {
                if (evento.color) {
                    estiloExtra = `style="background-color: ${evento.color};"`;
                    clasesExtra += ' dia-coloreado';
                }
                if (evento.tipo === 'clave') {
                    clasesExtra += ' dia-clave';
                }
                let tooltipContenido = '';
                if (evento.tipo === 'periodo') {
                    tooltipContenido = `[${evento.fecha_inicio} - ${evento.fecha_fin}]\n${evento.nombre}`;
                } else if (evento.tipo === 'festivo') {
                    tooltipContenido = `[${evento.fecha}]\n${evento.nombre}`;
                } else if (evento.tipo === 'clave') {
                    const fechaFormateada = `${String(dia).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;
                    tooltipContenido = `[${fechaFormateada}]\n${evento.nombre}`;
                }
                if (tooltipContenido) {
                    clasesExtra += ' dia-con-tooltip';
                    tooltipHtml = `<span class="calendar-tooltip">${tooltipContenido}</span>`;
                }
            }
            diasHtml += `<div class="day-number ${clasesExtra}" ${estiloExtra}>${dia}${tooltipHtml}</div>`;
        }
        return `
            <div class="month-container">
                <h4 class="month-title">${meses[month]} ${year}</h4>
                <div class="days-grid">
                    <div class="day-header">L</div><div class="day-header">M</div><div class="day-header">X</div>
                    <div class="day-header">J</div><div class="day-header">V</div><div class="day-header weekend">S</div><div class="day-header weekend">D</div>
                    ${diasHtml}
                </div>
            </div>`;
    }

    const toKey = (date) => {
        if (!date) return null;
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    function inicializarTooltipsDelCalendario() {
        const diasConTooltip = document.querySelectorAll('.dia-con-tooltip');
        const tooltipElement = document.createElement('div');
        tooltipElement.className = 'calendar-tooltip';
        document.body.appendChild(tooltipElement);
        diasConTooltip.forEach(dia => {
            const tooltipContent = dia.querySelector('.calendar-tooltip').innerHTML;
            dia.addEventListener('mouseenter', (e) => {
                tooltipElement.innerHTML = tooltipContent;
                tooltipElement.style.visibility = 'visible';
                tooltipElement.style.opacity = '1';
                const diaRect = e.target.getBoundingClientRect();
                const tooltipRect = tooltipElement.getBoundingClientRect();
                const spaceBelow = window.innerHeight - diaRect.bottom;
                let top, left;
                if (spaceBelow > tooltipRect.height + 10) {
                    top = diaRect.bottom + 5;
                } else {
                    top = diaRect.top - tooltipRect.height - 5;
                }
                left = diaRect.left + (diaRect.width / 2) - (tooltipRect.width / 2);
                if (left < 10) left = 10;
                if (left + tooltipRect.width > window.innerWidth - 10) left = window.innerWidth - tooltipRect.width - 10;
                tooltipElement.style.top = `${top}px`;
                tooltipElement.style.left = `${left}px`;
            });
            dia.addEventListener('mouseleave', () => {
                tooltipElement.style.visibility = 'hidden';
                tooltipElement.style.opacity = '0';
            });
        });
    }

    // --- 5. EJECUCIÓN ---
    cargarYRenderizarCurso();
    inicializarListenersDeGuardado();
});