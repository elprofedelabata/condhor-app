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
    const prevProfesorBtn = document.getElementById('prevProfesorBtn');
    const nextProfesorBtn = document.getElementById('nextProfesorBtn');
    const contextMenu = document.getElementById('context-menu');

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

            const eventosReales = asignacionesProfesor.map(asig => {
                const tramo = tramosMap[asig.id_tramo];
                const materia = materiasMap[asig.id_materia];
                const aula = aulasMap[asig.id_aula] || null;
                
                if (!tramo || !materia) {
                    console.warn(`Datos incompletos para la asignación ID: ${asig.id}. Se saltará.`);
                    return null;
                }
                
                const grupos = (materia.ids_unidades || []).map(id => unidadesMap[id]).filter(Boolean);
                const parseTimeToMin = t => { const [h, m] = (t || '00:00').split(':').map(Number); return h * 60 + m; };
                const duracionMins = parseTimeToMin(tramo.hora_fin) - parseTimeToMin(tramo.hora_inicio);

                return {
                    dia: tramo.diasemana,
                    hora_inicio: tramo.hora_inicio,
                    duracion: duracionMins,
                    materia_ref: materia.referencia,
                    nombreMateria: materia.nombre,
                    aula: aula,
                    grupos: grupos,
                    color: asig.color || '#cccccc'
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
                const key = `${evento.materia_ref}-${evento.aula ? evento.aula.id : ''}-${evento.grupos.map(g => g.id).join(',')}`;
                const ev = document.createElement('div');
                ev.className = 'schedule-event';
                ev.dataset.key = key;
                ev.dataset.dia = evento.dia;
                ev.dataset.horaInicio = evento.hora_inicio;
                ev.dataset.duracion = evento.duracion;
                ev.dataset.materiaRef = evento.materia_ref;
                ev.dataset.color = evento.color;
                ev.dataset.aula = JSON.stringify(evento.aula);
                ev.dataset.grupos = JSON.stringify(evento.grupos);
                const eventoInicioMin = parseTimeToMin(evento.hora_inicio);
                const top = ((eventoInicioMin - horaGridInicioMin) / 60) * rowHeight + 13;
                const height = (evento.duracion / 60) * rowHeight;
                const left = timeColWidth + (dayColWidth * (evento.dia - 1));
                ev.style.cssText = `top:${top}px; height:${height}px; left:${left}px; width:${dayColWidth - 2}px; background-color:${evento.color};`;
                const gruposTexto = evento.grupos.map(g => g.referencia).join(' · ');
                ev.innerHTML = `<div class="event-top-row"><span class="event-materia">${evento.materia_ref}</span><span class="event-aula">${evento.aula ? evento.aula.referencia : ''}</span></div><div class="event-grupos-container">${gruposTexto}</div>`;
                
                ev.addEventListener('mouseover', () => {
                    const legendItem = panelLeyenda.querySelector(`.leyenda-item[data-key="${key}"]`);
                    if (legendItem) {
                        legendItem.classList.add('leyenda-item-highlight');
                    }
                });

                ev.addEventListener('mouseout', () => {
                    const legendItem = panelLeyenda.querySelector(`.leyenda-item[data-key="${key}"]`);
                    if (legendItem) {
                        legendItem.classList.remove('leyenda-item-highlight');
                    }
                });

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
            aulasMap = aulasData.reduce((map, aula) => { map[aula.id] = aula; return map; }, {});
            unidadesMap = unidadesData.reduce((map, unidad) => { map[unidad.id] = unidad; return map; }, {});

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
        const aulaIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 -960 960 960" fill="currentColor" style="vertical-align: middle; margin-right: 4px;"><path d="M120-120v-80h80v-640h400v40h160v600h80v80H680v-600h-80v600H120Zm320-320q17 0 28.5-11.5T480-480q0-17-11.5-28.5T440-520q-17 0-28.5 11.5T400-480q0 17 11.5 28.5T440-440Z"/></svg>`;
        const unidadesIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 -960 960 960" fill="currentColor" style="vertical-align: middle; margin-right: 4px;"><path d="M40-160v-112q0-34 17.5-62.5T104-378q62-31 126-46.5T360-440q66 0 130 15.5T616-378q29 15 46.5 43.5T680-272v112H40Zm720 0v-120q0-44-24.5-84.5T666-434q51 6 96 20.5t84 35.5q36 20 55 44.5t19 53.5v120H760ZM360-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47Zm400-160q0 66-47 113t-113 47q-11 0-28-2.5t-28-5.5q27-32 41.5-71t14.5-81q0-42-14.5-81T544-792q14-5 28-6.5t28-1.5q66 0 113 47t47 113Z"/></svg>`;

        // Create a container for the legend items
        const leyendaItemsContainer = document.createElement('div');
        leyendaItemsContainer.className = 'leyenda-items-container';
        panelLeyenda.appendChild(leyendaItemsContainer); // Append it to panelLeyenda

        eventos.forEach(evento => {
            const key = `${evento.materia_ref}-${evento.aula ? evento.aula.id : ''}-${evento.grupos.map(g => g.id).join(',')}`;
            if (!leyendaSet.has(key)) {
                leyendaSet.add(key);
                const nombreMateria = evento.nombreMateria || evento.materia_ref;
                
                const aulaHTML = (evento.aula && evento.aula.nombre) ? `
                    <span class="leyenda-linea-info">
                        ${aulaIcon}
                        <span>${evento.aula.nombre}</span>
                    </span>` : '';

                const unidadesRef = evento.grupos.map(g => g.referencia).join(' · ');
                const unidadesHTML = unidadesRef ? `
                    <span class="leyenda-linea-info">
                        ${unidadesIcon}
                        <span>${unidadesRef}</span>
                    </span>` : '';

                const item = document.createElement('div');
                item.className = 'leyenda-item';
                item.dataset.key = key;
                item.innerHTML = `
                    <div class="leyenda-color" style="background-color: ${evento.color};"></div>
                    <div class="leyenda-info">
                        <span class="leyenda-materia">${nombreMateria}</span>
                        ${aulaHTML}
                        ${unidadesHTML}
                    </div>`;
                
                const leyendaColor = item.querySelector('.leyenda-color');

                leyendaColor.addEventListener('mouseover', () => {
                    const scheduleEvents = panelHorario.querySelectorAll(`.schedule-event[data-key="${key}"]`);
                    scheduleEvents.forEach(ev => {
                        ev.classList.add('schedule-event-highlight');
                    });
                });

                leyendaColor.addEventListener('mouseout', () => {
                    const scheduleEvents = panelHorario.querySelectorAll(`.schedule-event[data-key="${key}"]`);
                    scheduleEvents.forEach(ev => {
                        ev.classList.remove('schedule-event-highlight');
                    });
                });

                fragment.appendChild(item);
            }
        });
        leyendaItemsContainer.appendChild(fragment);
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

        nextProfesorBtn.addEventListener('click', () => {
            cambiarProfesor(1);
        });

        prevProfesorBtn.addEventListener('click', () => {
            cambiarProfesor(-1);
        });

        panelHorario.addEventListener('click', (e) => {
            const eventElement = e.target.closest('.schedule-event');
            
            if (!eventElement) {
                if (contextMenu.classList.contains('active')) {
                    contextMenu.classList.remove('active');
                }
                return;
            }

            e.stopPropagation();

            // --- 1. Recoger datos del evento ---
            const { dia, horaInicio, duracion, materiaRef, color, aula: aulaJSON, grupos: gruposJSON } = eventElement.dataset;
            const aula = JSON.parse(aulaJSON || 'null');
            const grupos = JSON.parse(gruposJSON || '[]');

            // --- 2. Resetear y preparar el menú contextual ---
            const menuItemUnidad = contextMenu.querySelector('[data-action="ver-unidad"]');
            const menuItemAula = contextMenu.querySelector('[data-action="ver-aula"]');
            
            // Limpiar estado anterior del item de unidad
            menuItemUnidad.classList.remove('has-submenu');
            let oldSubmenu = menuItemUnidad.querySelector('.context-submenu');
            if (oldSubmenu) oldSubmenu.remove();
            let oldArrow = menuItemUnidad.querySelector('.submenu-arrow');
            if (oldArrow) oldArrow.remove();

            // --- 3. Lógica para la opción de AULA ---
            if (aula && aula.referencia) {
                menuItemAula.style.display = 'block';
                menuItemAula.querySelector('.context-menu-text').textContent = `Ver horario del aula ${aula.referencia}`;
            } else {
                menuItemAula.style.display = 'none';
            }

            // --- 4. Lógica para la opción de UNIDAD(ES) ---
            if (grupos.length === 0) {
                menuItemUnidad.style.display = 'none';
            } else if (grupos.length === 1) {
                menuItemUnidad.style.display = 'block';
                menuItemUnidad.querySelector('.context-menu-text').textContent = `Ver horario de la unidad ${grupos[0].referencia}`;
            } else {
                menuItemUnidad.style.display = 'block';
                menuItemUnidad.classList.add('has-submenu');
                menuItemUnidad.querySelector('.context-menu-text').textContent = 'Ver horario de las unidades';
                
                // Crear y añadir flecha
                const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                arrow.setAttribute('class', 'submenu-arrow');
                arrow.setAttribute('height', '20px');
                arrow.setAttribute('viewBox', '0 -960 960 960');
                arrow.setAttribute('width', '20px');
                arrow.setAttribute('fill', 'currentColor');
                arrow.innerHTML = '<path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z"/>';
                menuItemUnidad.querySelector('.context-menu-link').appendChild(arrow);

                // Crear y llenar submenú
                const submenu = document.createElement('div');
                submenu.className = 'context-submenu';
                grupos.forEach(grupo => {
                    const subItemLink = document.createElement('a');
                    subItemLink.href = '#';
                    subItemLink.className = 'context-menu-link';
                    subItemLink.textContent = grupo.referencia;
                    subItemLink.dataset.action = 'ver-unidad-especifica';
                    subItemLink.dataset.unidadId = grupo.id;
                    submenu.appendChild(subItemLink);
                });
                menuItemUnidad.appendChild(submenu);
            }

            // --- 5. Rellenar cabecera del menú ---
            const diasSemana = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
            const diaStr = diasSemana[parseInt(dia, 10) - 1] || '?';
            const parseTimeToMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
            const formatMinToTime = m => {
                const hours = String(Math.floor(m / 60)).padStart(2, '0');
                const minutes = String(m % 60).padStart(2, '0');
                return `${hours}:${minutes}`;
            };
            const horaFin = formatMinToTime(parseTimeToMin(horaInicio) + parseInt(duracion, 10));
            const headerText = `${materiaRef} (${diaStr} - ${horaInicio} - ${horaFin})`;
            const contextMenuHeader = document.getElementById('context-menu-header');
            contextMenuHeader.textContent = headerText;
            contextMenuHeader.style.backgroundColor = color;

            // --- 6. Posicionar y mostrar el menú ---
            const { clientX: mouseX, clientY: mouseY } = e;
            contextMenu.classList.add('active');

            const menuWidth = contextMenu.offsetWidth;
            const menuHeight = contextMenu.offsetHeight;
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;

            let top = mouseY;
            let left = mouseX;

            if (mouseY + menuHeight > windowHeight) {
                top = mouseY - menuHeight;
            }
            if (mouseX + menuWidth > windowWidth) {
                left = mouseX - menuWidth;
            }
            if (top < 0) top = 5;
            if (left < 0) left = 5;

            contextMenu.style.top = `${top}px`;
            contextMenu.style.left = `${left}px`;
        });
    
        window.addEventListener('click', (e) => {
            // Si el menú está activo y el clic NO es dentro del menú, lo cierra
            if (contextMenu.classList.contains('active') && !contextMenu.contains(e.target)) {
                contextMenu.classList.remove('active');
            }
        });
    
        contextMenu.addEventListener('click', (e) => {
            const menuItem = e.target.closest('.context-menu-item');
            if (menuItem) {
                e.preventDefault(); // Evita que el enlace '#' recargue la página
                const action = menuItem.dataset.action;
                console.log(`Acción seleccionada: ${action} en el evento:`, e.target.closest('.schedule-event'));
                // Aquí se implementará la lógica para cada acción
                contextMenu.classList.remove('active');
            }
        });

        // --- Listeners para el modal de edición ---
        const modalOverlay = document.getElementById('simple-modal-overlay');
        const modalDialog = document.getElementById('simple-modal');
        const closeSimpleModal = document.getElementById('closeSimpleModal');
        const cancelSimpleModal = document.getElementById('cancelSimpleModal');

        function cerrarModal() {
            if (modalOverlay) modalOverlay.style.display = 'none';
            if (modalDialog) modalDialog.style.display = 'none';
        }

        if (closeSimpleModal) {
            closeSimpleModal.addEventListener('click', cerrarModal);
        }
        if (cancelSimpleModal) {
            cancelSimpleModal.addEventListener('click', cerrarModal);
        }
        if (modalOverlay) {
            modalOverlay.addEventListener('click', cerrarModal);
        }
        // Evitar que el clic dentro del modal lo cierre
        if (modalDialog) {
            modalDialog.addEventListener('click', (e) => e.stopPropagation());
        }
    }

    function cambiarProfesor(direccion) {
        if (!profesorActivo || !todosLosProfesores || todosLosProfesores.length === 0) return;
        
        const currentIndex = todosLosProfesores.findIndex(p => p.id === profesorActivo.id);
        
        if (currentIndex === -1) {
            if (todosLosProfesores.length > 0) {
                seleccionarProfesor(todosLosProfesores[0]);
            }
            return;
        }

        let nextIndex = currentIndex + direccion;

        if (nextIndex >= todosLosProfesores.length) {
            nextIndex = 0;
        } else if (nextIndex < 0) {
            nextIndex = todosLosProfesores.length - 1;
        }
        
        seleccionarProfesor(todosLosProfesores[nextIndex]);
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