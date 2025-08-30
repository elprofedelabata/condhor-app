document.addEventListener('DOMContentLoaded', () => {

    // 0) Estado de orden actual
    let currentSort = { column: 'nombre', order: 'asc' };

    // 1) Función que compara según currentSort
    function sortProfs(list) {
    return [...list].sort((a, b) => {
        let A, B;
        switch (currentSort.column) {
        case 'id':
            A = a.id; B = b.id;
            break;
        case 'nombre':
            // concatenar "Apellidos, Nombre"
            A = ([a.apellido1, a.apellido2].filter(Boolean).join(' ') + ', ' + a.nombre).toLowerCase();
            B = ([b.apellido1, b.apellido2].filter(Boolean).join(' ') + ', ' + b.nombre).toLowerCase();
            break;
        case 'altabaja':
            A = (a.altabaja || '').toLowerCase();
            B = (b.altabaja || '').toLowerCase();
            break;
        }
        if (A < B) return currentSort.order==='asc'? -1 : 1;
        if (A > B) return currentSort.order==='asc'? 1 : -1;
        return 0;
    });
    }

    // 2) Pinta las flechitas en los encabezados
    function updateArrows() {
    document.querySelectorAll('.arrow')
        .forEach(span => span.textContent = '');
    const btn = document.querySelector(`.thead-button[data-col="${currentSort.column}"] .arrow`);
    if (btn) btn.textContent = currentSort.order === 'asc' ? '▲' : '▼';
    }


    // Módulos y rutas relativas tal como las defines
    const fs      = require('fs');
    const path    = require('path');
    const params  = new URLSearchParams(window.location.search);
    const curso   = params.get('curso') || 'desconocido';
    const appRoot = process.cwd();
    const cursoDir = path.join(appRoot, 'cursos', curso);

    // Resolvemos rutas absolutas desde la carpeta del script
    const PROFESORES_FILE = path.join(cursoDir, 'profesores.json');
    const DEPTS_FILE      = path.join(cursoDir, 'departamentos.json');

    // Refs al DOM
    const tbody          = document.querySelector('.data-table tbody');
    const totalSpan      = document.getElementById('total');
    const mostradosSpan  = document.getElementById('mostrados');
    const addDeptSelect  = document.getElementById('addprofDept');
    const form  = document.getElementById('addProfForm');

    // Refs de los grupos y selects de sustitución
    const grpA          = document.getElementById('addgroupSustitutoA');
    const grpB          = document.getElementById('addgroupSustituyendoA');
    const selectA       = document.getElementById('addsustitutoA');
    const selectB       = document.getElementById('addsustituyendoA');
    const estadoRadios  = document.querySelectorAll('input[name="estado"]');


    // — refs del modal de edición —
    const editOverlay     = document.getElementById('edit-overlay');
    const editModal       = document.getElementById('edit-modal');
    const btnCerrarEdit   = document.getElementById('closeEditModal');
    const btnCancelarEdit = document.getElementById('cancelEdit');
    const editForm        = document.getElementById('editProfForm');

    const editIdInput     = document.getElementById('editprofId');
    const editNombreInput = document.getElementById('editprofNombre');
    const editAp1Input    = document.getElementById('editprofAp1');
    const editAp2Input    = document.getElementById('editprofAp2');
    const editEmailInput  = document.getElementById('editprofEmail');
    const editDeptSelect  = document.getElementById('editprofDept');

    // los radios de estado dentro del modal de edición:
    const editStateRadios = document.querySelectorAll('#edit-modal input[name="estado"]');

    // grupos y selects condicionales:
    const editGrpA        = document.getElementById('editgroupSustitutoA');
    const editGrpB        = document.getElementById('editgroupSustituyendoA');
    const editSelectA     = document.getElementById('editsustitutoA');
    const editSelectB     = document.getElementById('editsustituyendoA');

    // — refs del modal de Borrar —
    const deleteOverlay   = document.getElementById('delete-overlay');
    const deleteModal     = document.getElementById('delete-modal');
    const btnCerrarDelete = document.getElementById('closeDeleteModal');
    const btnCancelarDelete = document.getElementById('cancelDelete');
    const btnConfirmDelete  = document.getElementById('confirmDelete');

    // spans donde mostraremos datos
    const delProfId   = document.getElementById('delProfId');
    const delProfName = document.getElementById('delProfName');
    const delProfDept = document.getElementById('delProfDept');

    // variable para guardar temporalmente el id a borrar
    let profIdToDelete = null;





    // 0) Ocultamos ambos grupos al cargar por defecto
    grpA.style.display = 'none';
    grpB.style.display = 'none';

    // 1) Listener en cada radio de estado
    estadoRadios.forEach(radio => {
    radio.addEventListener('change', () => {
        // 1.a) Reseteamos ambos selects
        selectA.selectedIndex = 0;
        selectB.selectedIndex = 0;

        // 2) Mostramos/ocultamos según la opción
        estadoRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                const val = radio.value.toLowerCase();  // 'alta', 'baja' o 'sustituto/a'
                // reset selects
                selectA.selectedIndex = 0;
                selectB.selectedIndex = 0;

                if (val === 'baja') {
                grpA.style.display = 'block';
                grpB.style.display = 'none';
                }
                else if (val.includes('sustit')) {
                grpA.style.display = 'none';
                grpB.style.display = 'block';
                }
                else {
                // 'alta' u otro
                grpA.style.display = 'none';
                grpB.style.display = 'none';
                }
            });
        });
    });
    });


    // 0) Asegúrate de que están ocultos al cargar
    editGrpA.style.display = 'none';
    editGrpB.style.display = 'none';

    // 1) Listener en los radios de estado del modal de editar
    editStateRadios.forEach(radio => {
    radio.addEventListener('change', () => {
        const val = radio.value.trim().toLowerCase(); // 'alta','baja','sustituto/a'

        // reset de selects
        editSelectA.selectedIndex = 0;
        editSelectB.selectedIndex = 0;

        if (val === 'baja') {
        editGrpA.style.display = 'block';
        editGrpB.style.display = 'none';
        }
        else if (val.includes('sustit')) {
        editGrpA.style.display = 'none';
        editGrpB.style.display = 'block';
        }
        else {
        // 'alta' u otro
        editGrpA.style.display = 'none';
        editGrpB.style.display = 'none';
        }
    });
    });


    let allProfs = [];
    let deptMap  = new Map();


    // Lee los JSON locales con fs
    try {
    const profsData = JSON.parse(fs.readFileSync(PROFESORES_FILE, 'utf-8'));
    const deptsData = JSON.parse(fs.readFileSync(DEPTS_FILE,      'utf-8'));

    allProfs = profsData;
    deptMap = new Map(deptsData.map(d => [d.id, d]));

    populateDeptSelect(addDeptSelect,  deptsData);
    populateDeptSelect(editDeptSelect, deptsData);
    renderTable(allProfs);

    } catch (err) {
    console.error('Error cargando JSON:', err);
    alert('No se pudieron cargar los datos de profesores o departamentos.');
    }

    function populateDeptSelect(selectElem, depts) {
    selectElem.innerHTML = '<option value="">-- elige uno --</option>';
    depts.forEach(d => {
        const opt = document.createElement('option');
        opt.value       = d.id;
        opt.textContent = d.nombre;
        selectElem.appendChild(opt);
    });
    }

    function renderTable(profs) {
    tbody.innerHTML = '';
    // primero ordenamos según la columna y orden actuales
    const ordered = sortProfs(profs);

    // Si no hay resultados, mostramos un mensaje
    if (profs.length === 0) {
        tbody.innerHTML = `
        <tr>
            <td colspan="6" style="
            text-align: center;
            font-style: italic;
            color: #666;
            padding: 1rem 0;
            ">
            No se encontraron profesores
            </td>
        </tr>
        `;
        totalSpan.textContent     = allProfs.length;
        mostradosSpan.textContent = 0;
        return;
    }


    ordered.forEach(prof => {

      const dept = deptMap.get(prof.id_departamento);
      const deptName  = dept?.nombre ?? '—';
      const deptColor = dept?.color  ?? '#ccc';      

      const estadoIcons = {
        'Alta': `<svg style="vertical-align: middle" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#28a745"><path d="M234-276q51-39 114-61.5T480-360q69 0 132 22.5T726-276q35-41 54.5-93T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 59 19.5 111t54.5 93Zm246-164q-59 0-99.5-40.5T340-580q0-59 40.5-99.5T480-720q59 0 99.5 40.5T620-580q0 59-40.5 99.5T480-440Zm0 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z"/></svg>`,
        'Baja': `<svg style="vertical-align: middle" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#dc3545"><path d="M480-160q43 0 84-11.5t78-33.5L487-360h-7q-67 0-130 21.5T234-276q50 55 110 85.5T480-160ZM819-28 701-146q-49 32-105 49T480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-59 16.5-115T145-701L27-820l57-57L876-85l-57 57Zm-5-232L586-488q17-19 25.5-42.5T620-580q0-58-41-99t-99-41q-26 0-49.5 8.5T388-686L260-814q49-32 105-49t115-17q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 59-17 115t-49 105Z"/></svg>`,
        'Sustituto/a': `<svg style="vertical-align: middle" xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="-50 -50 600 660"><path fill="#fd7e14" d="m255.688-.312 2.931.005C272.952-.262 286.898.247 301 3l2.718.488C347.323 11.378 388.46 31.068 422 60l2.258 1.922C437.763 73.733 450.434 86.484 461 101l2.57 3.45c6.04 8.19 11.4 16.706 16.43 25.55l1.104 1.915c13.176 23.02 21.86 48.538 27.209 74.46l.446 2.154c2.986 15.642 3.616 31.278 3.553 47.159l-.005 2.931c-.045 14.333-.554 28.279-3.307 42.381l-.488 2.718C500.622 347.323 480.932 388.46 452 422l-1.922 2.258C438.267 437.763 425.516 450.434 411 461l-3.45 2.57c-8.19 6.04-16.706 11.4-25.55 16.43l-1.915 1.104c-23.02 13.176-48.538 21.86-74.46 27.209l-2.154.446c-15.642 2.986-31.278 3.616-47.158 3.553l-2.932-.005c-14.333-.045-28.279-.554-42.381-3.307l-2.718-.488C164.677 500.622 123.54 480.932 90 452l-2.258-1.922C74.237 438.267 61.566 425.516 51 411l-2.57-3.45C42.39 399.36 37.03 390.845 32 382l-1.104-1.915c-13.176-23.02-21.86-48.538-27.208-74.46l-.447-2.154C.255 287.83-.375 272.193-.312 256.313l.005-2.932C-.262 239.048.247 225.102 3 211l.488-2.718C11.378 164.677 31.068 123.54 60 90l1.922-2.258C73.733 74.237 86.484 61.566 101 51l3.45-2.57c8.19-6.04 16.706-11.4 25.55-16.43l1.915-1.104c23.02-13.176 48.538-21.86 74.46-27.208l2.154-.447C224.17.255 239.807-.375 255.688-.312M139 89l-3.18 2.324c-7.175 5.334-13.88 11.088-20.34 17.264q-1.472 1.404-2.96 2.793C75.55 145.94 53.793 197.43 51.9 247.67c-.54 18.745 1.199 36.436 5.413 54.705l.86 3.744c2.03 8.443 4.334 16.909 7.827 24.881l2 1 .996-1.906c12.718-22.886 41.972-30.063 65.449-36.958 56.821-16.146 119.687-16.172 173.243 11.926 17.653 10.255 27.504 26.668 32.688 46.026 7.537 29.978 4.571 64.413-7.376 92.912 3.504-.586 6.37-1.493 9.547-3.074l2.562-1.276 2.641-1.337 2.594-1.28c2.58-1.296 5.12-2.651 7.656-4.033.839-.43 1.677-.862 2.541-1.306 4.5-2.57 6.87-4.549 8.397-9.592q.586-2.728 1.062-5.477l.574-2.75c6.289-30.953 2.883-63.696-14.632-90.493-5.896-8.863-12.55-16.74-19.942-24.382l-2.309-2.43C328.178 290.89 322.19 285.924 316 281c8.75-.209 17.105.284 25.75 1.625l3.516.538c33.18 5.302 76 14.545 97.898 42.61L445 328h2c9.84-26.478 14.22-54.768 13-83l-.092-2.235C458.062 206.212 444.76 168.443 423 139l-2.324-3.18c-5.334-7.175-11.088-13.88-17.264-20.34a364 364 0 0 1-2.793-2.96C366.06 75.55 314.57 53.793 264.33 51.9 220.07 50.626 174.936 62.44 139 89"/><path fill="#fd7e14" d="m228 126 3.34 1.031c7.929 2.739 14.157 6.727 20.66 11.969l2.531 1.875c12.325 10.609 17.487 27.304 18.688 42.98.663 20.487-6.846 39.797-20.7 54.807-11.13 11.417-26.128 17.313-41.938 17.58-19.258.068-38.811-2.729-53.581-16.242-13.76-14.96-17.134-34.318-18-54l-.195-3.613c-.531-17.325 5.84-30.437 17.55-42.965C175.588 121.809 203.494 118.238 228 126M272 118c51.57-.854 51.57-.854 71.063 17.027 15.26 15.538 24.157 35.39 24.25 57.223-.195 16.78-5.329 31.86-16.313 44.75-14.062 13.222-31.018 18.337-50 18-6.657-.409-13.657-.886-20-3 1.581-4.361 3.801-8.255 6.125-12.25 12.737-22.341 23.737-47.507 16.934-73.672-5.286-18.03-16.924-31.481-30.258-44.152C272 120 272 120 272 118"/></svg>`
      };

      const estadoColors = {
        'Alta':        '#28a745',  // verde
        'Baja':        '#dc3545',  // rojo
        'Sustituto/a':'#fd7e14'  // naranja
      };

      const estado     = prof.altabaja;
      const color      = estadoColors[estado] || '#6c757d';  // gris por defecto
      const iconSvg   = estadoIcons[estado] || '';

      const tr = document.createElement('tr');
      const idStr = String(prof.id).padStart(4, '0');
      tr.innerHTML += `<td style="text-align:center"><span class="prof-id">${idStr}</span></td>`;

      const apellidos = [prof.apellido1, prof.apellido2].filter(x=>x).join(' ');
      tr.innerHTML += `<td>
      ${iconSvg}
      <span style="color:#333">${apellidos}, <b>${prof.nombre}</b></span>
      <div class="prof-departamento-badge" style="background-color: ${deptColor}">${deptName}</div>
      </td>`;

      tr.innerHTML += `<td style="text-align:center; color: ${color}"><div class="prof-estado-circulo" style="background-color: ${color}"></div> <b>${estado}</b></td>`;
      tr.innerHTML += `<td style="text-align:center">...en el aula 314.</td>`;
      tr.innerHTML += `
        <td style="text-align:right">
            <button class="btn-acciones edit-btn" data-id="${prof.id}" title="Editar">
                <svg style="vertical-align:middle" xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/></svg>
                <span>Editar</span>
            </button>
            <button class="btn-acciones del-btn" data-id="${prof.id}" title="Borrar">
                <svg style="vertical-align:middle" xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>
                <span>Borrar</span>
            </button>
          </td>`;
      tbody.appendChild(tr);

        // atachamos el listener sobre el botón Editar que acabamos de marcar
        const editBtn = tr.querySelector('.edit-btn');
        editBtn.addEventListener('click', () => openEditModal(prof.id));

        // listener para borrar
        const delBtn = tr.querySelector('.del-btn');
        delBtn.addEventListener('click', () => openDeleteModal(prof.id));
        

    });

    totalSpan.textContent     = allProfs.length;
    mostradosSpan.textContent = profs.length;

    // Para que el click en cabecera recuerde el filtro activo:
    currentFiltered = profs;
  }

  updateArrows();

    // 4) FILTRADO EN TIEMPO REAL
    const searchInput = document.getElementById('searchProf');
    const clearBtn = document.getElementById('clearSearch');

    // Al escribir, mostramos u ocultamos la “X”
    searchInput.addEventListener('input', () => {
    clearBtn.style.display = searchInput.value ? 'block' : 'none';
    // tu lógica de filtrado…
    const term = searchInput.value.trim().toLowerCase();
    const filtered = allProfs.filter(prof => {
        const fullName = [prof.nombre, prof.apellido1, prof.apellido2]
                        .filter(Boolean).join(' ').toLowerCase();
        const deptName = (deptMap.get(prof.id_departamento)?.nombre || '')
                        .toLowerCase();
        return fullName.includes(term) || deptName.includes(term);
    });
    renderTable(filtered);
    });

    // Al pulsar la “X”, vaciamos, ocultamos y restauramos toda la tabla
    clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearBtn.style.display = 'none';
    renderTable(allProfs);
    searchInput.focus();
    });

    searchInput.addEventListener('input', () => {
    const term = searchInput.value.trim().toLowerCase();

    // Filtramos sobre el array original allProfs
    const filtered = allProfs.filter(prof => {
        // concatenamos nombre + apellidos
        const fullName = [
        prof.nombre,
        prof.apellido1,
        prof.apellido2
        ].filter(Boolean).join(' ').toLowerCase();

        // buscamos también en el nombre del departamento
        const deptName = (deptMap.get(prof.id_departamento)?.nombre || '')
                        .toLowerCase();

        return fullName.includes(term) || deptName.includes(term);
    });

    // Volvemos a pintar la tabla con los resultados filtrados
    renderTable(filtered);
    });

    // Refs a los selects de sustitución (pon esto junto al resto de refs)
    const selectSustituto  = document.getElementById('addsustitutoA');
    const selectDadoDeBaja = document.getElementById('addsustituyendoA');

    /**
     * Rellena los selects de sustituto/a y de baja con los
     * profesores que tengan ese estado en allProfs.
     */
    function populateSustitucionSelects() {
    // 1) Profesores con estado "Sustituto/a"
    const sustitutos = allProfs.filter(p =>
        p.altabaja.toLowerCase().includes('sustit')
    );
    selectSustituto.innerHTML = `<option value="">-- elige Sustituto/a --</option>` +
        sustitutos.map(p => {
        const idStr     = String(p.id).padStart(4, '0');
        const apellidos = [p.apellido1, p.apellido2]
                            .filter(Boolean).join(' ');
        return `<option value="${p.id}">
                    ${idStr} – ${apellidos}, ${p.nombre}
                </option>`;
        }).join('');

    // 2) Profesores con estado "baja"
    const bajas = allProfs.filter(p =>
        p.altabaja.toLowerCase() === 'baja'
    );
    selectDadoDeBaja.innerHTML = `<option value="">-- elige profesor/a de baja --</option>` +
        bajas.map(p => {
        const idStr     = String(p.id).padStart(4, '0');
        const apellidos = [p.apellido1, p.apellido2]
                            .filter(Boolean).join(' ');
        return `<option value="${p.id}">
                    ${idStr} – ${apellidos}, ${p.nombre}
                </option>`;
        }).join('');
    }




    // 1) Refs al DOM del modal
    const btnAgregar    = document.getElementById('btnAgregar');
    const addOverlay    = document.getElementById('addProf-overlay');
    const addModal      = document.getElementById('addProf-modal');
    const btnCerrarAdd  = document.getElementById('closeAddProfModal');
    const btnCancelarAdd= document.getElementById('cancelAddProf');

    // 2) Funciones de mostrar/ocultar
    function showAddModal(e) {
    e && e.preventDefault();

    // 1) Reseteamos TODO el formulario
    form.reset();

    // 2) Desmarcamos absolutamente todos los radios de estado
    estadoRadios.forEach(r => r.checked = false);

    // 3) Marcamos el de "Alta" como default
    const altaRadio = document.querySelector('input[name="estado"][value="alta"]');
    altaRadio.checked = true;

    // 4) Forzamos un evento change para inicializar bien los grupos
    altaRadio.dispatchEvent(new Event('change'));

    // 5) Ocultamos ambos grupos por si acaso
    grpA.style.display = grpB.style.display = 'none';

    // 6) Poblamos selects de sustitución
    populateSustitucionSelects();

    // 7) Calculamos nextId e inyectamos en el input
    const maxId  = allProfs.reduce((m,p)=>Math.max(m,p.id), 0);
    document.getElementById('addprofId').value = String(maxId+1).padStart(4,'0');

    // 8) Finalmente mostramos el modal
    addOverlay.style.display = 'block';
    addModal.style.display   = 'flex';
    }

    function hideAddModal() {
        addOverlay.style.display = 'none';
        addModal.style.display   = 'none';
    }

    // 3) Listeners
    btnAgregar.addEventListener('click',       showAddModal);
    btnCerrarAdd.addEventListener('click',     hideAddModal);
    btnCancelarAdd.addEventListener('click',   hideAddModal);
    // Si cierras al clickar el overlay también:
    addOverlay.addEventListener('click',       hideAddModal);

    // 3) Listeners de ordenación
    document.querySelectorAll('.thead-button').forEach(btn => {
    btn.addEventListener('click', () => {
        const col = btn.dataset.col;
        if (currentSort.column === col) {
        // mismo campo → invertir orden
        currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
        } else {
        // nuevo campo → por defecto ascendente
        currentSort.column = col;
        currentSort.order  = 'asc';
        }
        updateArrows();
        renderTable(currentFiltered || allProfs);
    });
    });


    // 2) Listener del formulario de Alta
    form.addEventListener('submit', e => {
        e.preventDefault();

        // 1) Leemos todos los campos como antes
        const id              = Number(document.getElementById('addprofId').value);
        const nombre          = document.getElementById('addprofNombre').value.trim();
        const apellido1       = document.getElementById('addprofAp1').value.trim();
        const apellido2       = document.getElementById('addprofAp2').value.trim();
        const correo          = document.getElementById('addprofEmail').value.trim();
        const id_departamento = Number(addDeptSelect.value);
        // Raw radio en minúsculas → capitalizamos
        const raw             = document.querySelector('input[name="estado"]:checked')
                                    .value.trim().toLowerCase();
        const altabaja        = raw.charAt(0).toUpperCase() + raw.slice(1);

        // 2) Calculamos id_sustituto y, si toca, actualizamos el prof dado de baja
        let id_sustituto = 0;
        if (raw === 'baja') {
            id_sustituto = Number(selectSustituto.value) || 0;
        }
        else if (raw.includes('sustit')) {
            const reemplazaId = Number(selectDadoDeBaja.value) || 0;
            if (reemplazaId > 0) {
            const profBaja = allProfs.find(p => p.id === reemplazaId);
            if (profBaja) profBaja.id_sustituto = id;
            }
        }

        // 3) Creamos y volcamos el nuevo prof en disco
        const nuevoProf = {
            id, nombre, apellido1, apellido2,
            id_departamento,
            correo_electronico: correo,
            altabaja,
            id_sustituto
        };
        allProfs.push(nuevoProf);
        fs.writeFileSync(PROFESORES_FILE, JSON.stringify(allProfs, null, 2), 'utf-8');

        // 4) Refrescamos la tabla
        renderTable(allProfs);

        // 5) Decide qué hacer según el botón pulsado
        const btnId = e.submitter.id;
        if (btnId === 'submitAddContinue') {
            // — "Añadir y seguir": reinicia el formulario para un nuevo alta —

            // a) Reset completo
            form.reset();
            // b) Desmarca todos y vuelve a poner "Alta"
            estadoRadios.forEach(r => r.checked = false);
            const altaRadio = document.querySelector('input[name="estado"][value="alta"]');
            altaRadio.checked = true;
            altaRadio.dispatchEvent(new Event('change'));
            // c) Repuebla los selects de sustitución
            populateSustitucionSelects();
            // d) Calcula y actualiza la nueva ID
            const maxId  = allProfs.reduce((m,p)=>Math.max(m,p.id), 0);
            document.getElementById('addprofId').value = String(maxId+1).padStart(4,'0');
            // e) Vuelve a enfocar el primer campo
            document.getElementById('addprofNombre').focus();

        } else {
            // — "Añadir": cierra el modal —
            hideAddModal();
        }
    });

    function populateEditSustitucionSelects() {
    // Sustitutos (prof. con estado “sustituto/a”)
    const sustitutos = allProfs.filter(p =>
        p.altabaja.toLowerCase().includes('sustit')
    );
    editSelectA.innerHTML = `<option value="">-- elige sustituto/a --</option>` +
        sustitutos.map(p => {
        const idStr     = String(p.id).padStart(4,'0');
        const apellidos = [p.apellido1, p.apellido2].filter(Boolean).join(' ');
        return `<option value="${p.id}">${idStr} – ${apellidos}, ${p.nombre}</option>`;
        }).join('');

    // Bajas (prof. con estado exactamente “baja”)
    const bajas = allProfs.filter(p =>
        p.altabaja.toLowerCase() === 'baja'
    );
    editSelectB.innerHTML = `<option value="">-- elige dado de baja --</option>` +
        bajas.map(p => {
        const idStr     = String(p.id).padStart(4,'0');
        const apellidos = [p.apellido1, p.apellido2].filter(Boolean).join(' ');
        return `<option value="${p.id}">${idStr} – ${apellidos}, ${p.nombre}</option>`;
        }).join('');
    }

    function openEditModal(id) {
    // 1) Buscar el profesor
    const prof = allProfs.find(p => p.id === id);
    if (!prof) return;

    // 2) Rellenar campos básicos
    editIdInput.value    = String(prof.id).padStart(4,'0');
    editNombreInput.value= prof.nombre;
    editAp1Input.value   = prof.apellido1;
    editAp2Input.value   = prof.apellido2;
    editEmailInput.value = prof.correo_electronico || '';
    editDeptSelect.value = prof.id_departamento;

    // 3) Inicializar selects de sustitución
    populateEditSustitucionSelects();

    // 4) Marcar estado y disparar change para mostrar/ocultar grupos
    editStateRadios.forEach(r => r.checked = false);
    const raw = prof.altabaja.trim().toLowerCase();
    const radio = Array.from(editStateRadios)
                        .find(r => r.value.trim().toLowerCase() === raw);
    if (radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change'));
    }

    // 5) Rellenar el select activo:
    if (raw === 'baja') {
        editSelectA.value = prof.id_sustituto || '';
    } else if (raw.includes('sustit')) {
        // encontrar a quién sustituye este profesor
        const reemplazado = allProfs.find(p => p.id_sustituto === prof.id);
        editSelectB.value = reemplazado ? reemplazado.id : '';
    }

    // 6) Mostrar el modal
    editOverlay.style.display = 'block';
    editModal.style.display   = 'flex';
    }

    function hideEditModal() {
    editOverlay.style.display = editModal.style.display = 'none';
    }

    // Listeners para cerrar
    btnCerrarEdit.addEventListener('click',   hideEditModal);
    btnCancelarEdit.addEventListener('click', hideEditModal);
    editOverlay.addEventListener('click',     hideEditModal);


    editForm.addEventListener('submit', e => {
    e.preventDefault();

    // 1) Leer campos
    const id              = Number(editIdInput.value);
    const nombre          = editNombreInput.value.trim();
    const apellido1       = editAp1Input.value.trim();
    const apellido2       = editAp2Input.value.trim();
    const correo          = editEmailInput.value.trim();
    const id_departamento = Number(editDeptSelect.value);

    // Raw + capitalizado
    const raw   = Array.from(editStateRadios)
                        .find(r => r.checked).value.trim().toLowerCase();
    const altabaja = raw.charAt(0).toUpperCase() + raw.slice(1);

    // 2) Encontrar y actualizar el objeto en allProfs
    const prof = allProfs.find(p => p.id === id);
    prof.nombre            = nombre;
    prof.apellido1         = apellido1;
    prof.apellido2         = apellido2;
    prof.correo_electronico= correo;
    prof.id_departamento   = id_departamento;
    prof.altabaja          = altabaja;
    prof.id_sustituto      = 0;  // reset por defecto

    // 3) Lógica de sustitución
    if (raw === 'baja') {
        prof.id_sustituto = Number(editSelectA.value) || 0;
    }
    else if (raw.includes('sustit')) {
        const reemplazaId = Number(editSelectB.value) || 0;
        if (reemplazaId) {
        const profBaja = allProfs.find(p => p.id === reemplazaId);
        if (profBaja) profBaja.id_sustituto = id;
        }
    }

    // 4) Guardar en disco y refrescar tabla
    fs.writeFileSync(PROFESORES_FILE, JSON.stringify(allProfs, null, 2), 'utf-8');
    renderTable(allProfs);

    // 5) Cerrar modal
    hideEditModal();
    });

    

    // Abre el modal de borrar y carga datos
    function openDeleteModal(id) {
        const prof = allProfs.find(p => p.id === id);
        if (!prof) return;
        profIdToDelete = id;

        // Rellenamos ID y Nombre
        delProfId.textContent   = String(prof.id).padStart(4,'0');
        delProfName.textContent = [
            prof.apellido1, prof.apellido2
        ].filter(Boolean).join(' ') + ', ' + prof.nombre;

        // Rellenamos badge de departamento con color
        const dept = deptMap.get(prof.id_departamento) || {};
        const badge = document.getElementById('delProfDeptBadge');
        badge.textContent = dept.nombre || '—';
        badge.style.backgroundColor = dept.color || '#ccc';

        deleteOverlay.style.display = 'block';
        deleteModal.style.display   = 'flex';
    }

    // Cierra el modal de borrar
    function hideDeleteModal() {
        deleteOverlay.style.display = deleteModal.style.display = 'none';
        profIdToDelete = null;
    }

    // Listeners para cerrar
    btnCerrarDelete.addEventListener('click', hideDeleteModal);
    btnCancelarDelete.addEventListener('click', hideDeleteModal);
    deleteOverlay.addEventListener('click', hideDeleteModal);

    // Confirmar borrado
    btnConfirmDelete.addEventListener('click', () => {
    if (profIdToDelete === null) return;

    // Filtramos el array
    allProfs = allProfs.filter(p => p.id !== profIdToDelete);

    // Guardamos en disco
    fs.writeFileSync(PROFESORES_FILE,
        JSON.stringify(allProfs, null, 2), 'utf-8');

    // Refrescamos tabla y cerramos
    renderTable(allProfs);
    hideDeleteModal();
    });
    









});
