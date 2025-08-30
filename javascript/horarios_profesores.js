document.addEventListener('DOMContentLoaded', () => {
    // 1. --- MÓDULOS Y CONFIGURACIÓN INICIAL ---
    const fs = require('fs');
    const path = require('path');

    const PALETA_DE_COLORES = [
        '#e6194B', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
        '#911eb4', '#42d4f4', '#f032e6', '#bcf60c', '#fabebe',
        '#008080', '#e6beff', '#9A6324', '#800000', '#aaffc3',
        '#808000', '#ffd8b1', '#000075', '#a9a9a9', '#ffffff'
    ];

    // Referencias al DOM
    const selectorProfesorBtn = document.getElementById('selectorProfesorBtn');
    const selectorDropdown = document.getElementById('selectorDropdown');
    const profesorSearchInput = document.getElementById('profesorSearchInput');
    const profesorListContainer = document.getElementById('profesorList');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const displayCodigo = document.querySelector('.profesor-codigo');
    const displayDepartamento = document.querySelector('.profesor-departamento');
    const displayNombre = document.querySelector('.profesor-nombre');
    const panelHorario = document.querySelector('.panel-horario');
    const panelLeyenda = document.querySelector('.panel-leyenda');
    const horarioVersionSelect = document.getElementById('horarioVersionSelect');

    let todosLosProfesores = [], departamentosMap = {}, materiasMap = {}, aulasMap = {}, unidadesMap = {};
    let versionHorarioActiva = null, profesorActivo = null;

    // 2. --- FUNCIONES PRINCIPALES DE CARGA Y RENDERIZADO ---

    function actualizarVistaCompleta() {
        if (!versionHorarioActiva || !profesorActivo) {
            return;
        }

        const params = new URLSearchParams(window.location.search);
        const cursoNombre = params.get('curso');
        if (!cursoNombre) return;

        try {
            const rutaVersion = path.join(process.cwd(), 'cursos', cursoNombre, versionHorarioActiva);
            const tramosData = JSON.parse(fs.readFileSync(path.join(rutaVersion, 'tramoshorarios.json'), 'utf-8'));
            const asignacionesData = JSON.parse(fs.readFileSync(path.join(rutaVersion, 'asignaciones.json'), 'utf-8'));
            const tramosMap = tramosData.reduce((map, tramo) => { map[tramo.id] = tramo; return map; }, {});
            const asignacionesProfesor = asignacionesData.filter(asig => asig.id_profesor === profesorActivo.id);

            // Se definen aquí, fuera del bucle, para que mantengan su valor
            const colorMap = {};
            let colorIndex = 0;

            const eventosReales = asignacionesProfesor.map(asig => {
                const tramo = tramosMap[asig.id_tramo];
                const materia = materiasMap[asig.id_materia];
                const aula = aulasMap[asig.id_aula] || '';
                
                if (!tramo || !materia) {
                    console.warn(`Datos incompletos para la asignación ID: ${asig.id}. Se saltará.`);
                    return null;
                }
                
                const grupos = (materia.id_unidades || []).map(id => unidadesMap[id]).filter(Boolean);
                const parseTimeToMin = t => { const [h, m] = (t || '00:00').split(':').map(Number); return h * 60 + m; };
                const duracionMins = parseTimeToMin(tramo.hora_fin) - parseTimeToMin(tramo.hora_inicio);

                // --- CORRECCIÓN ---
                // Se han eliminado las dos líneas que reseteaban el colorMap y colorIndex.
                // Ahora creamos la clave y asignamos el color.
                const actividadKey = `${materia.id}-${grupos.join('-')}`;
                if (!colorMap[actividadKey]) {
                    colorMap[actividadKey] = PALETA_DE_COLORES[colorIndex % PALETA_DE_COLORES.length];
                    colorIndex++;
                }
                
                return {
                    dia: tramo.diasemana,
                    hora_inicio: tramo.hora_inicio,
                    duracion: duracionMins,
                    materia_ref: materia.referencia,
                    nombreMateria: materia.nombre,
                    aula: aula,
                    grupos: grupos,
                    color: colorMap[actividadKey] // Se usa el color asignado
                };
            }).filter(Boolean);

            renderHorario(tramosData, eventosReales);
            renderizarLeyenda(eventosReales);

        } catch (error) {
            console.error(`Error al cargar datos para la versión ${versionHorarioActiva}:`, error);
            panelHorario.innerHTML = `<p style="color:red; padding:1rem;">Error al cargar datos del horario.</p>`;
        }
    }

    function renderHorario(tramos, eventos) {
        panelHorario.innerHTML = '';
        const scheduleContainer = document.createElement('div');
        scheduleContainer.className = 'schedule';
        const scheduleHeader = document.createElement('div');
        scheduleHeader.className = 'schedule-header';
        const scheduleBody = document.createElement('div');
        scheduleBody.className = 'schedule-body';
        scheduleContainer.appendChild(scheduleHeader);
        scheduleContainer.appendChild(scheduleBody);
        panelHorario.appendChild(scheduleContainer);

        const parseTimeToMin = t => { const [h, m] = (t || '00:00').split(':').map(Number); return h * 60 + m; };
        const todosLosTiempos = tramos.flatMap(t => [parseTimeToMin(t.hora_inicio), parseTimeToMin(t.hora_fin)]);
        if (todosLosTiempos.length === 0) return;
        const minHora = Math.min(...todosLosTiempos);
        const maxHora = Math.max(...todosLosTiempos);
        const horaVisualInicio = Math.floor(minHora / 60);
        const horaVisualFin = Math.max(23, Math.ceil(maxHora / 60));
        scheduleHeader.innerHTML = `<div class="time-col"></div>` + ['L','M','X','J','V','S','D'].map(d => `<div class="day-col">${d}</div>`).join('');
        const fragment = document.createDocumentFragment();
        for (let h = horaVisualInicio; h <= horaVisualFin; h++) {
            const timeLabel = document.createElement('div');
            timeLabel.className = 'time-label';
            timeLabel.textContent = `${String(h).padStart(2, '0')}:00`;
            fragment.appendChild(timeLabel);
            for (let d = 0; d < 7; d++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                fragment.appendChild(cell);
            }
        }
        scheduleBody.appendChild(fragment);
        requestAnimationFrame(() => {
            if (!scheduleBody.offsetHeight) return;
            const rowHeight = 60;
            const timeColWidth = 60;
            const dayColWidth = (scheduleBody.clientWidth - timeColWidth) / 7;
            const horaGridInicioMin = horaVisualInicio * 60;

            tramos.forEach(tramo => {
                const divTramo = document.createElement('div');
                divTramo.className = `schedule-tramo ${tramo.lectivo ? 'lectivo' : 'no-lectivo'}`;
                const inicioMin = parseTimeToMin(tramo.hora_inicio);
                const finMin = parseTimeToMin(tramo.hora_fin);
                const top = ((inicioMin - horaGridInicioMin) / 60) * rowHeight + 13;
                const height = ((finMin - inicioMin) / 60) * rowHeight;
                const left = timeColWidth + (dayColWidth * (tramo.diasemana - 1));
                divTramo.style.cssText = `top:${top}px; height:${height}px; left:${left}px; width:${dayColWidth}px;`;
                scheduleBody.appendChild(divTramo);
            });
            eventos.forEach(evento => {
                const ev = document.createElement('div');
                ev.className = 'schedule-event';
                const eventoInicioMin = parseTimeToMin(evento.hora_inicio);
                const top = ((eventoInicioMin - horaGridInicioMin) / 60) * rowHeight + 13;
                const height = (evento.duracion / 60) * rowHeight;
                const left = timeColWidth + (dayColWidth * (evento.dia - 1));
                ev.style.cssText = `top:${top}px; height:${height}px; left:${left}px; width:${dayColWidth - 2}px; background-color:${evento.color};`;
                const gruposTexto = evento.grupos.join(' · ');
                ev.innerHTML = `<div class="event-top-row"><span class="event-materia">${evento.materia_ref}</span><span class="event-aula">${evento.aula}</span></div><div class="event-grupos-container">${gruposTexto}</div>`;
                scheduleBody.appendChild(ev);
            });
        });
    }

    // 3. --- FUNCIONES AUXILIARES Y DE CARGA INICIAL ---
    
    function cargarYRenderizarDatos() {
        const params = new URLSearchParams(window.location.search);
        const cursoNombre = params.get('curso');
        if (!cursoNombre) { return; }
        try {
            const rutaBase = path.join(process.cwd(), 'cursos', cursoNombre);
            const profesoresData = JSON.parse(fs.readFileSync(path.join(rutaBase, 'profesores.json'), 'utf-8'));
            const departamentosData = JSON.parse(fs.readFileSync(path.join(rutaBase, 'departamentos.json'), 'utf-8'));
            const materiasData = JSON.parse(fs.readFileSync(path.join(rutaBase, 'materias.json'), 'utf-8'));
            const aulasData = JSON.parse(fs.readFileSync(path.join(rutaBase, 'aulas.json'), 'utf-8'));
            const unidadesData = JSON.parse(fs.readFileSync(path.join(rutaBase, 'unidades.json'), 'utf-8'));

            materiasMap = materiasData.reduce((map, mat) => { map[mat.id] = mat; return map; }, {});
            departamentosMap = departamentosData.reduce((map, depto) => {
                map[depto.id] = { nombre: depto.nombre, abreviatura: depto.abreviatura, color: depto.color || '#cccccc' };
                return map;
            }, {});
            aulasMap = aulasData.reduce((map, aula) => { map[aula.id] = aula.nombre; return map; }, {});
            unidadesMap = unidadesData.reduce((map, unidad) => { map[unidad.id] = unidad.nombre; return map; }, {});

            todosLosProfesores = profesoresData.map(profesor => {
                const nombreFormateado = `${profesor.apellido1 || ''} ${profesor.apellido2 || ''}`.trim() + `, ${profesor.nombre || ''}`;
                const codigoFormateado = String(profesor.id).padStart(4, '0');
                const depto = departamentosMap[profesor.id_departamento] || {};
                return { ...profesor, codigo: codigoFormateado, nombreCompleto: nombreFormateado, departamentoNombre: depto.nombre || 'Sin Depto.', departamentoAbreviatura: depto.abreviatura || '---', departamentoColor: depto.color || '#cccccc' };
            }).sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto));
            
            renderProfesorList(todosLosProfesores);

            if (todosLosProfesores.length > 0) {
                seleccionarProfesor(todosLosProfesores[0]);
            }
        } catch (error) { console.error("Error al cargar o procesar los archivos JSON:", error); }
    }
    
    function renderProfesorList(profesores) {
        profesorListContainer.innerHTML = '';
        if (profesores.length === 0) {
            profesorListContainer.innerHTML = `<p style="color: var(--texto-secundario); padding: 1rem;">No se encontraron resultados.</p>`;
            return;
        }
        const fragment = document.createDocumentFragment();
        profesores.forEach(profesor => {
            const item = document.createElement('div');
            item.className = 'profesor-item';
            item.dataset.id = profesor.id;
            item.innerHTML = `<div class="profesor-item-info"><span class="profesor-item-codigo">${profesor.codigo}</span><span class="profesor-item-nombre">${profesor.nombreCompleto}</span><span class="profesor-item-departamento" style="background-color: ${profesor.departamentoColor};">${profesor.departamentoNombre}</span></div>`;
            fragment.appendChild(item);
        });
        profesorListContainer.appendChild(fragment);
    }
    
    function seleccionarProfesor(profesor) {
        if (!profesor) return;
        profesorActivo = profesor;
        displayCodigo.textContent = profesor.codigo;
        displayNombre.textContent = profesor.nombreCompleto;
        displayDepartamento.textContent = profesor.departamentoNombre;
        displayDepartamento.style.backgroundColor = profesor.departamentoColor;
        actualizarVistaCompleta();
    }

    function renderizarLeyenda(eventos) {
        panelLeyenda.innerHTML = '<h3>Leyenda</h3>';
        const leyendaSet = new Set();
        const fragment = document.createDocumentFragment();
        eventos.forEach(evento => {
            const key = `${evento.materia_ref}-${evento.aula}-${evento.grupos.join(',')}`;
            if (!leyendaSet.has(key)) {
                leyendaSet.add(key);
                const nombreMateria = evento.nombreMateria || evento.materia_ref;
                const gruposTexto = evento.grupos.join(' · ');
                const item = document.createElement('div');
                item.className = 'leyenda-item';
                item.innerHTML = `<div class="leyenda-color" style="background-color: ${evento.color};"></div><div class="leyenda-info"><span class="leyenda-materia">${nombreMateria}</span><span class="leyenda-aula-grupos">${evento.aula ? `Aula: ${evento.aula}` : ''}${evento.aula && gruposTexto ? ' - ' : ''}${gruposTexto ? `Grupos: ${gruposTexto}` : ''}</span></div>`;
                fragment.appendChild(item);
            }
        });
        panelLeyenda.appendChild(fragment);
    }

    function inicializarListeners() {
        selectorProfesorBtn.addEventListener('click', () => { selectorDropdown.classList.toggle('show'); });
        window.addEventListener('click', (e) => {
            if (!selectorProfesorBtn.contains(e.target) && !selectorDropdown.contains(e.target)) {
                selectorDropdown.classList.remove('show');
            }
        });
        profesorSearchInput.addEventListener('input', (e) => {
            const termino = e.target.value.toLowerCase();
            clearSearchBtn.style.display = termino ? 'block' : 'none';
            const profesoresFiltrados = todosLosProfesores.filter(profesor => profesor.nombreCompleto.toLowerCase().includes(termino) || profesor.codigo.includes(termino) || profesor.departamentoNombre.toLowerCase().includes(termino));
            renderProfesorList(profesoresFiltrados);
        });
        clearSearchBtn.addEventListener('click', () => {
            profesorSearchInput.value = '';
            profesorSearchInput.dispatchEvent(new Event('input'));
            profesorSearchInput.focus();
        });
        profesorListContainer.addEventListener('click', (e) => {
            const item = e.target.closest('.profesor-item');
            if (item) {
                const profesorId = item.dataset.id;
                const profesorSeleccionado = todosLosProfesores.find(p => p.id == profesorId);
                if (profesorSeleccionado) { seleccionarProfesor(profesorSeleccionado); }
                selectorDropdown.classList.remove('show');
            }
        });
        horarioVersionSelect.addEventListener('change', (e) => {
            versionHorarioActiva = e.target.value;
            actualizarVistaCompleta();
        });
    }

    function cargarVersionesDeHorario() {
        const params = new URLSearchParams(window.location.search);
        const cursoNombre = params.get('curso');
        horarioVersionSelect.innerHTML = '';
        if (!cursoNombre) return null;
        try {
            const rutaCurso = path.join(process.cwd(), 'cursos', cursoNombre);
            const carpetasHorario = fs.readdirSync(rutaCurso, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory() && dirent.name.startsWith('horario'))
                .map(dirent => dirent.name)
                .sort();
            if (carpetasHorario.length === 0) {
                horarioVersionSelect.style.display = 'none';
                return null;
            }
            horarioVersionSelect.style.display = 'inline-block';
            carpetasHorario.forEach(nombreCarpeta => {
                const option = document.createElement('option');
                option.value = nombreCarpeta;
                option.textContent = nombreCarpeta.replace('horario', 'Horario ');
                horarioVersionSelect.appendChild(option);
            });
            return carpetasHorario[0];
        } catch (error) {
            console.error("Error buscando las versiones de horario:", error);
            horarioVersionSelect.style.display = 'none';
            return null;
        }
    }

    // 4. --- EJECUCIÓN ---
    versionHorarioActiva = cargarVersionesDeHorario();
    cargarYRenderizarDatos();
    inicializarListeners();
});