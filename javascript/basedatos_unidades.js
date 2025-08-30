document.addEventListener('DOMContentLoaded', () => {
  const fs   = require('fs');
  const path = require('path');
  const params    = new URLSearchParams(window.location.search);
  const curso     = params.get('curso') || 'desconocido';
  const baseDir   = path.join(process.cwd(), 'cursos', curso);

  // Rutas a los JSON
  const UNIDADES_FILE   = path.join(baseDir, 'unidades.json');
  const NIVELES_FILE    = path.join(baseDir, 'niveleseducativos.json');
  const PROFESORES_FILE = path.join(baseDir, 'profesores.json');

  // Refs DOM
  const container     = document.getElementById('units-container');
  const searchInput   = document.getElementById('searchUnidad');
  const clearBtn      = document.getElementById('clearSearch');
  const totalSpan     = document.getElementById('total');
  const mostradosSpan = document.getElementById('mostrados');

  // Datos originales
  let allUnidades, niveles, profesores;
  try {
    allUnidades = JSON.parse(fs.readFileSync(UNIDADES_FILE,   'utf-8'));
    niveles     = JSON.parse(fs.readFileSync(NIVELES_FILE,    'utf-8'));
    profesores  = JSON.parse(fs.readFileSync(PROFESORES_FILE, 'utf-8'));
  } catch (err) {
    console.error('Error cargando JSON de unidades:', err);
    alert('No se pudieron cargar los datos de unidades.');
    return;
  }

  // Mapas para lookup rápido
  const nivelMap = new Map(niveles.map(n => [n.id, n.nombre]));
  const profMap  = new Map(profesores.map(p => [
    p.id,
    `${p.apellido1}${p.apellido2 ? ' ' + p.apellido2 : ''}, ${p.nombre}`
  ]));
  const nivelNameMap = new Map(niveles.map(n => [n.id, n.nombre.toLowerCase()]));


    // — Refs para Añadir unidad —
    const addOverlay       = document.getElementById('add-unit-overlay');
    const addModal         = document.getElementById('add-unit-modal');
    const btnCloseAddUnit  = document.getElementById('closeAddUnit');
    const btnCancelAddUnit = document.getElementById('cancelAddUnit');
    const addForm          = document.getElementById('addUnitForm');
    const addIdInput       = document.getElementById('addUnitId');
    const addRefInput      = document.getElementById('addUnitReferencia');
    const addNameInput     = document.getElementById('addUnitNombre');
    const addLevelSelect  = document.getElementById('addUnitLevel');
    const addTutorSelect   = document.getElementById('addUnitTutor');
    const btnOpenAddUnit   = document.getElementById('btnAgregar'); // ya existe en toolbar

    // Reutiliza populateTutorSelect
    // (asegúrate de tenerla definida, tal como en el Editar)
    populateTutorSelect(addTutorSelect);

    // Muestra el modal “Añadir unidad”
    function showAddUnitModal(e) {
        e.preventDefault();
        addForm.reset();
        populateTutorSelect(addTutorSelect);
        populateLevelSelect(addLevelSelect);

        const maxId = allUnidades.reduce((m,u)=> Math.max(m,u.id), 0);
        addIdInput.value = String(maxId+1).padStart(4,'0');

        addOverlay.style.display = 'block';
        addModal.style.display   = 'flex';
    }

    // Oculta el modal
    function hideAddUnitModal() {
        addOverlay.style.display = addModal.style.display = 'none';
    }

    // Listeners para cerrar
    btnCloseAddUnit .addEventListener('click', hideAddUnitModal);
    btnCancelAddUnit.addEventListener('click', hideAddUnitModal);
    addOverlay      .addEventListener('click', hideAddUnitModal);
    btnOpenAddUnit  .addEventListener('click', showAddUnitModal);

    // Al enviar el formulario de “Añadir”
    addForm.addEventListener('submit', e => {
        e.preventDefault();
        const id        = Number(addIdInput.value);
        const ref       = addRefInput.value.trim();
        const name      = addNameInput.value.trim();
        const levelId = Number(addLevelSelect.value);
        const tutorId   = Number(addTutorSelect.value);

        // crea nuevo objeto
        const newUnit = {
            id,
            referencia: ref,
            nombre: name,
            id_nivel_educativo: levelId,
            id_tutor: tutorId
        };

        // añade a la lista y guarda
        allUnidades.push(newUnit);
        fs.writeFileSync(UNIDADES_FILE,
                        JSON.stringify(allUnidades, null, 2),
                        'utf-8');

        // refresca tabla
        renderUnits(allUnidades);

        // decide qué botón fue:
        const btnId = e.submitter.id;
        if (btnId === 'submitAddContinueUnit') {
            // reinicia para seguir añadiendo
            addForm.reset();
            populateTutorSelect(addTutorSelect);
            const nextId = allUnidades.reduce((m,u)=> Math.max(m,u.id), 0) + 1;
            addIdInput.value = String(nextId).padStart(4,'0');
            addRefInput.focus();
        } else {
            // cierra modal
            hideAddUnitModal();
        }
    });







    // — Refs para editar unidad —
    const editOverlay      = document.getElementById('edit-unit-overlay');
    const editModal        = document.getElementById('edit-unit-modal');
    const btnCloseEditUnit = document.getElementById('closeEditUnit');
    const btnCancelEditUnit= document.getElementById('cancelEditUnit');
    const editForm         = document.getElementById('editUnitForm');
    const editIdInput      = document.getElementById('editUnitId');
    const editRefInput     = document.getElementById('editUnitReferencia');
    const editNameInput    = document.getElementById('editUnitNombre');
    const editTutorSelect  = document.getElementById('editUnitTutor');
    const editLevelSelect = document.getElementById('editUnitLevel');

    function populateLevelSelect(selectElem) {
    selectElem.innerHTML = '<option value="">-- elige uno --</option>' +
        niveles.map(n => (
        `<option value="${n.id}">${n.nombre}</option>`
        )).join('');
    }

    // Poblamos el <select> de tutor con todo el profesorado
    function populateTutorSelect(selectElem) {
    selectElem.innerHTML = '<option value="">-- elige uno --</option>' +
        profesores.map(p => {
        const idStr = String(p.id).padStart(4,'0');
        const name  = `${p.apellido1}${p.apellido2? ' ' + p.apellido2 : ''}, ${p.nombre}`;
        return `<option value="${p.id}">${idStr} – ${name}</option>`;
        }).join('');
    }

    // Abre el modal y carga los datos de la unidad
    function openEditUnitModal(unitId) {
        const unidad = allUnidades.find(u => u.id === unitId);
        if (!unidad) return;

        editForm.reset();
        populateTutorSelect(editTutorSelect);
        populateLevelSelect(editLevelSelect);

        editIdInput.value      = String(unidad.id).padStart(4,'0');
        editRefInput.value     = unidad.referencia;
        editNameInput.value    = unidad.nombre;
        editLevelSelect.value  = unidad.id_nivel_educativo;
        editTutorSelect.value  = unidad.id_tutor || '';

        editOverlay.style.display = 'block';
        editModal.style.display   = 'flex';
    }

    // Oculta el modal de editar
    function hideEditUnitModal() {
        editOverlay.style.display = editModal.style.display = 'none';
    }

    // Listeners de cierre
    btnCloseEditUnit.addEventListener('click', hideEditUnitModal);
    btnCancelEditUnit.addEventListener('click', hideEditUnitModal);
    editOverlay.addEventListener('click', hideEditUnitModal);

    // Al pulsar “Guardar”
    editForm.addEventListener('submit', e => {
        e.preventDefault();

        // 1) Leer valores
        const id    = Number(editIdInput.value);
        const ref   = editRefInput.value.trim();
        const name  = editNameInput.value.trim();
        const tutor = Number(editTutorSelect.value);
        const levelId = Number(editLevelSelect.value);

        // 2) Actualizar en memoria
        const unidad = allUnidades.find(u => u.id === id);
        unidad.referencia = ref;
        unidad.nombre    = name;
        unidad.id_tutor  = tutor;
        unidad.id_nivel_educativo = levelId;

        // 3) Guardar en disco
        fs.writeFileSync(
            UNIDADES_FILE,
            JSON.stringify(allUnidades, null, 2),
            'utf-8'
        );

        // 4) Refrescar vista y cerrar modal
        renderUnits(allUnidades);
        hideEditUnitModal();
    });

    // — Refs para Eliminar unidad —
    const deleteOverlay      = document.getElementById('delete-unit-overlay');
    const deleteModal        = document.getElementById('delete-unit-modal');
    const btnCloseDeleteUnit = document.getElementById('closeDeleteUnit');
    const btnCancelDelete    = document.getElementById('cancelDeleteUnit');
    const btnConfirmDelete   = document.getElementById('confirmDeleteUnit');
    const deleteInfoDiv      = document.getElementById('delete-unit-info');

    // Variable temporal para saber qué ID vamos a borrar
    let unitToDeleteId = null;

    /**
     * Abre el modal de confirmación de borrado para la unidad dada.
     */
    function openDeleteUnitModal(id) {
        unitToDeleteId = id;
        const u = allUnidades.find(x => x.id === id);
        if (!u) return;

        // Inyecta la info: ID + Referencia y Nombre + badge de nivel
        const nivelName = nivelMap.get(u.id_nivel_educativo) || '—';
        deleteInfoDiv.innerHTML = `
            <span style="font-size:0.8rem; color:#666">
            ${String(u.id).padStart(4,'0')}
            </span>
            <span>${u.referencia} | ${u.nombre}</span>
        `;

        deleteOverlay.style.display = 'block';
        deleteModal.style.display   = 'flex';
    }

    /** Cierra el modal de borrado */
    function hideDeleteUnitModal() {
        deleteOverlay.style.display = deleteModal.style.display = 'none';
        unitToDeleteId = null;
    }

    // Listeners de cierre
    btnCloseDeleteUnit.addEventListener('click', hideDeleteUnitModal);
    btnCancelDelete   .addEventListener('click', hideDeleteUnitModal);
    deleteOverlay     .addEventListener('click', hideDeleteUnitModal);

    // Al confirmar el borrado:
    btnConfirmDelete.addEventListener('click', () => {
        if (unitToDeleteId == null) return;

        // 1) Elimina de allUnidades
        allUnidades = allUnidades.filter(u => u.id !== unitToDeleteId);

        // 2) Guarda en disco
        fs.writeFileSync(
            UNIDADES_FILE,
            JSON.stringify(allUnidades, null, 2),
            'utf-8'
        );

        // 3) Refresca la vista
        renderUnits(allUnidades);

        // 4) Cierra modal
        hideDeleteUnitModal();
    });











  // Función que dibuja las unidades pasadas, agrupadas por nivel
  function renderUnits(units) {
    container.innerHTML = '';
    totalSpan.textContent     = allUnidades.length;
    mostradosSpan.textContent = units.length;

    if (units.length === 0) {
      container.innerHTML = `
        <p style="text-align:center; color:#666; font-style:italic; margin:2rem">
          No se encontraron unidades
        </p>`;
      return;
    }

    // agrupa por id_nivel_educativo
    const grupos = units.reduce((acc, u) => {
      const key = u.id_nivel_educativo;
      if (!acc[key]) acc[key] = [];
      acc[key].push(u);
      return acc;
    }, {});

    Object.keys(grupos)
      .sort((a,b) => Number(a) - Number(b))
      .forEach(nivelId => {
        const nivelName = nivelMap.get(Number(nivelId)) || 'Nivel desconocido';
        const items     = grupos[nivelId];

        const details = document.createElement('details');
        details.open = true;
        const summary = document.createElement('summary');
        summary.innerHTML =  `${nivelName} <span style="color:#666">[${items.length}]</span>`;
        details.appendChild(summary);

        const table = document.createElement('table');
        table.classList.add('data-table');
        table.style.margin = "1rem 0";

        table.innerHTML = `
          <colgroup>
            <col style="width: 60px;">
            <col style="width: 90px;">
            <col style="width: 500px;">
            <col style="width: 300px;">
            <col style="width: 160px;">
            <col>
          </colgroup>
          <thead>
            <tr>
              <th>ID</th>
              <th>Referencia</th>
              <th>Nombre</th>
              <th>Tutor/a</th>
              <th>Ahora mismo...</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${items.map(u => {
              const tutorName = profMap.get(u.id_tutor) || '—';
              return `
                <tr>
                  <td style="text-align:center; color:#666">
                    <span style="font-size:0.8rem;color:#666">
                      ${String(u.id).padStart(4,'0')}
                    </span>
                  </td>
                  <td style="text-align:center">${u.referencia}</td>
                  <td style="text-align:center">${u.nombre}</td>
                  <td>${tutorName}</td>
                  <td style="color:#666;font-style:italic">
                    ...no tiene clase
                  </td>
                  <td style="text-align:right">
                    <button class="btn-acciones edit-btn" data-id="${u.id}" title="Editar">
                        <svg style="vertical-align:middle" xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/></svg>
                        <span>Editar</span>
                    </button>
                    <button class="btn-acciones del-btn" data-id="${u.id}" title="Borrar">
                        <svg style="vertical-align:middle" xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>
                        <span>Borrar</span>
                    </button>
                  </td>

                  </tr>`;
            }).join('')}
          </tbody>
        `;
        details.appendChild(table);
        container.appendChild(details);
      });
  }

  // Inicial render
  renderUnits(allUnidades);

  // Muestra/oculta la “X” según haya texto
  clearBtn.style.display = 'none';
  searchInput.addEventListener('input', () => {
    const term = searchInput.value.trim().toLowerCase();
    clearBtn.style.display = term ? 'block' : 'none';

    // filtrado sobre allUnidades
    const filtered = allUnidades.filter(u => {
      if (u.referencia.toLowerCase().includes(term)) return true;
      if (u.nombre.toLowerCase().includes(term)) return true;
      const tutor = profMap.get(u.id_tutor) || '';
      if (tutor.toLowerCase().includes(term)) return true;
      const nivel = nivelNameMap.get(u.id_nivel_educativo) || '';
      if (nivel.includes(term)) return true;
      return false;
    });

    renderUnits(filtered);
  });

  // Al pulsar la “X”, restauramos todo
  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearBtn.style.display = 'none';
    renderUnits(allUnidades);
    searchInput.focus();
  });

    container.addEventListener('click', e => {
    // Delegación: si hace click en editar
    if (e.target.closest('.edit-btn')) {
        const id = Number(e.target.closest('.edit-btn').dataset.id);
        openEditUnitModal(id);
    }
    // si hace click en borrar
    if (e.target.closest('.del-btn')) {
        const id = Number(e.target.closest('.del-btn').dataset.id);
        openDeleteUnitModal(id);
    }
    });



});
