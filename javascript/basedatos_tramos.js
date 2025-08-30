document.addEventListener('DOMContentLoaded', () => {

  // ——————————————————————————————————————————————
  // 0) Setup inicial y multi-perfil
  // ——————————————————————————————————————————————
  const fs   = require('fs');
  const path = require('path');

  const params      = new URLSearchParams(window.location.search);
  const curso       = params.get('curso') || 'desconocido';
  let currentPerfil = parseInt(params.get('perfil'), 10) || 1;
  const perfilesDir = path.join(process.cwd(), 'cursos', curso);

  // Referencias a la barra de perfiles
  const perfilBar    = document.querySelector('.perfil-bar');
  const addPerfilBtn = perfilBar.querySelector('.perfil-add-btn');

  // Construye botones según los ficheros tramosNN.json que encuentre
  const perfilesFiles = fs.readdirSync(perfilesDir)
    .filter(f => /^tramos\d{2}\.json$/.test(f))
    .sort();

  perfilesFiles.forEach(file => {
    const id = parseInt(file.slice(6,8), 10);
    const btn = document.createElement('button');
    btn.type           = 'button';
    btn.className      = 'perfil-btn';
    btn.dataset.perfil = id;
    // etiqueta: usa el nombre dentro del JSON
    try {
      const temp = JSON.parse(fs.readFileSync(path.join(perfilesDir,file),'utf8'));
      btn.textContent = temp.perfil.nombre;
    } catch {
      btn.textContent = `Perfil ${id}`;
    }
    if (id === currentPerfil) btn.classList.add('active');
    perfilBar.insertBefore(btn, addPerfilBtn);

    btn.addEventListener('click', () => {
      if (id !== currentPerfil) selectPerfil(id);
    });
  });

  const btnDeletePerfil = document.getElementById('btnDeletePerfil');

  // función que comprueba cuántos botones de perfil hay
  function updateDeleteBtnState() {
    // contamos únicamente los botones .perfil-btn
    const count = perfilBar.querySelectorAll('.perfil-btn').length;
    btnDeletePerfil.disabled = (count <= 1);
  }

  // justo DESPUÉS de crear/injectar todos los botones de perfil:
  updateDeleteBtnState();


  // Limita a 8 perfiles
  if (perfilesFiles.length >= 8) addPerfilBtn.style.display = 'none';

  addPerfilBtn.addEventListener('click', () => {
    if (perfilesFiles.length >= 8) return;
    // busca siguiente NN libre
    let next = 1;
    while (fs.existsSync(path.join(perfilesDir, `tramos${String(next).padStart(2,'0')}.json`))) {
      next++;
    }
    const nuevoFich = `tramos${String(next).padStart(2,'0')}.json`;
    const plantilla = {
      perfil: {
        nombre: `Perfil ${next}`,
        hora_inicio: "08:00",
        inicios_diferentes: false,
        sincronizar_dias: true,
        inicios_diferentes_retrasos: [0,0,0,0,0,0,0]
      },
      tramos: []
    };
    fs.writeFileSync(path.join(perfilesDir,nuevoFich),
                     JSON.stringify(plantilla, null, 2), 'utf8');

    if (perfilBar.querySelectorAll('.perfil-btn').length + 1 >= 8) {
      addPerfilBtn.style.display = 'none';
    }

    // recarga con el nuevo perfil activo
    window.location.search = `?curso=${curso}&perfil=${next}`;
  });


  // ——————————————————————————————————————————————
  // 1) Variables para los datos cargados
  // ——————————————————————————————————————————————
  let data;     // todo el JSON
  let perfil;   // data.perfil
  let tramos;   // data.tramos

  // ——————————————————————————————————————————————
  // 2) Referencias al DOM y helpers
  // ——————————————————————————————————————————————
  const perfilNombreInput  = document.getElementById('perfilNombre');
  const perfilArchivoInput = document.getElementById('perfilArchivo');
  const horaInicioInput    = document.getElementById('horaInicio');
  const chkDifferent       = document.getElementById('chkDifferentStart');
  const chkSynchro         = document.getElementById('chkSynchro');
  const differentRow       = document.getElementById('differentStartRow');
  const tbody              = document.querySelector('.tramos-table tbody');
  const startDelayInputs   = Array.from(differentRow.querySelectorAll('.input-start-day'));

  function parseTimeToMin(t) {
    const [h, m] = (t || '00:00').split(':').map(Number);
    return h * 60 + m;
  }
  function formatMinToTime(min) {
    const h = String(Math.floor(min/60)).padStart(2,'0');
    const m = String(min%60).padStart(2,'0');
    return `${h}:${m}`;
  }

  // Listener global para inputs numéricos vacíos → 0
  document.addEventListener('change', e => {
    const tgt = e.target;
    if (tgt.matches('input[type="number"]') && tgt.value.trim()==='') {
      tgt.value = '0';
      if (tgt.closest('tbody')) {
        recalcAll();
        saveData();
        renderSchedule();
      }
    }
  });

  // ——————————————————————————————————————————————
  // 3) Función para (re)seleccionar un perfil
  // ——————————————————————————————————————————————
  function selectPerfil(id) {
    // marca botón activo
    perfilBar.querySelectorAll('.perfil-btn')
      .forEach(b => b.classList.toggle('active', +b.dataset.perfil===id));
    currentPerfil = id;

    // lee JSON
    const file = `tramos${String(id).padStart(2,'0')}.json`;
    const fp   = path.join(perfilesDir, file);
    try {
      data   = JSON.parse(fs.readFileSync(fp,'utf8'));
      perfil = data.perfil;
      tramos = data.tramos;
    } catch (err) {
      alert(`Error cargando ${file}`);
      data   = { perfil: {}, tramos: [] };
      perfil = data.perfil;
      tramos = data.tramos;
    }

    // rellena UI
    perfilNombreInput .value = perfil.nombre || '';
    perfilArchivoInput.value = file;
    horaInicioInput  .value = perfil.hora_inicio || '08:00';
    chkDifferent     .checked = !!perfil.inicios_diferentes;
    chkSynchro       .checked = !!perfil.sincronizar_dias;
    differentRow.style.display = chkDifferent.checked ? 'table-row' : 'none';
    startDelayInputs.forEach((inp,i) => {
      inp.value = perfil.inicios_diferentes_retrasos?.[i] ?? 0;
    });

    // pinta todo
    updateAll();

    updateDeleteBtnState();
    
  }

  // ——————————————————————————————————————————————
  // 4) Guardar en el fichero correcto
  // ——————————————————————————————————————————————
  function saveData() {
    // actualiza data.perfil antes de escribir
    perfil.nombre                       = perfilNombreInput.value;
    perfil.hora_inicio                  = horaInicioInput.value;
    perfil.inicios_diferentes           = chkDifferent.checked;
    perfil.sincronizar_dias             = chkSynchro.checked;
    perfil.inicios_diferentes_retrasos  = startDelayInputs.map(i=>parseInt(i.value,10)||0);

    const file = `tramos${String(currentPerfil).padStart(2,'0')}.json`;
    fs.writeFileSync(
      path.join(perfilesDir, file),
      JSON.stringify({ perfil, tramos }, null, 2),
      'utf8'
    );
  }

  // ——————————————————————————————————————————————
  // 5) updateAll (refresca tabla + schedule)
  // ——————————————————————————————————————————————
  function updateAll() {
    renderTramosTable();
    recalcAll();
    updateUpDownButtons();
    renderSchedule();
  }

  // 5b) Guardar retrasos de inicio cuando el usuario los modifique
  startDelayInputs.forEach((inp, i) => {
    inp.addEventListener('change', () => {
      // 1) Normalizar a número
      const v = parseInt(inp.value, 10) || 0;
      inp.value = v;
      // 2) Actualizar en memoria
      perfil.inicios_diferentes_retrasos[i] = v;
      // 3) Persistir en el JSON 
      saveData();
      // 4) Volver a calcular tabla y horario
      recalcAll();
      renderSchedule();
    });
  });



  // ——————————————————————————————————————————————
  // 6) Aquí va TODO tu código existente de renderTramosTable, recalcAll,
  //    updateUpDownButtons y renderSchedule, SIN cambios.
  //    Simplemente cópialo aquí tal cual lo tenías.
  // ——————————————————————————————————————————————

  function renderTramosTable() {
    tbody.innerHTML = '';

    // 1) Ocultamos la fila de offsets si no hay tramos
    differentRow.style.display = tramos.length > 0 && chkDifferent.checked
      ? 'table-row'
      : 'none';

    // 2) Si no hay tramos, mostramos mensaje y salimos
    if (tramos.length === 0) {
      const trEmpty = document.createElement('tr');
      trEmpty.innerHTML = `
        <td colspan="13" style="text-align:center; padding:1rem; color:#666;">
          No se han añadido tramos aún.
        </td>
      `;
      tbody.appendChild(trEmpty);
      return;
    }

    // 3) Si sí hay tramos, volvemos a insertar la fila de offsets
    tbody.appendChild(differentRow);

    let cursorMin = parseTimeToMin(horaInicioInput.value);
    tramos.forEach(tramo => {
      const duration = tramo.duraciones.find(d => d > 0) || 0;
      const startMin = cursorMin;
      const endMin   = startMin + duration;

      const tr = document.createElement('tr');
      tr.classList.add(tramo.lectivo ? 'lectivo' : 'descanso');
      tr.innerHTML = `
        <td><span style="text-align:right;display:block;padding:0">${tramo.id}</span></td>
        ${tramo.duraciones.map(d => `
          <td><input type="number" class="input-day" min="0" step="1" value="${d}"
                    style="width:40px;text-align:center"></td>
        `).join('')}
        <td><span class="input-time">${formatMinToTime(startMin)}</span></td>
        <td><span class="input-time">${formatMinToTime(endMin)}</span></td>
        <td><input type="number" class="input-space" min="0" step="1"
                   value="${tramo.espacio}" style="width:40px;text-align:center"></td>
        <td><input type="text" class="input-turno" value="${tramo.turno}"
                   style="width:60px;text-align:center"></td>
        <td class="td-acciones" style="padding: 0.25rem 0 0.25rem 0">
          <button class="btn-accion-tramo btn-subir" title="Subir">
            <svg style="vertical-align:middle" xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M444-192v-438L243-429l-51-51 288-288 288 288-51 51-201-201v438h-72Z"/></svg>
          </button>
          <button class="btn-accion-tramo btn-bajar" title="Bajar">
            <svg style="vertical-align:middle" xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M440-800v487L216-537l-56 57 320 320 320-320-56-57-224 224v-487h-80Z"/></svg>
          </button>
          <button class="btn-accion-tramo btn-duplicar" title="Duplicar">
            <svg style="vertical-align:middle" xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z"/></svg>
          </button>
          <button class="btn-accion-tramo btn-cambiar-lectivo" title="Lectivo / Descanso">
            <svg style="vertical-align:middle" width="16px" height="16px" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><polygon points="0,0 16,0 0,16" fill="var(--azul-mar)"/><polygon points="16,16 16,0 0,16" fill="var(--rojo-melocoton)"/></svg>
          </button>
          <button class="btn-accion-tramo btn-eliminar" title="Eliminar">
            <svg style="vertical-align:middle" xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
      cursorMin = endMin + (tramo.espacio || 0);
    });
  }

  function recalcAll() {

    if (tramos.length === 0) return;

    let current = parseTimeToMin(horaInicioInput.value);
    Array.from(tbody.rows).forEach((row, idxRow) => {
      if (row.id === 'differentStartRow') return;
      const idx = idxRow - 1;
      const cells     = row.cells;
      const dayInputs = Array.from(cells).slice(1,8).map(td => td.querySelector('input'));
      const dur       = dayInputs.map(i => parseInt(i.value,10)||0).find(v => v>0) || 0;

      // actualizar JSON
      tramos[idx].duraciones = dayInputs.map(i => parseInt(i.value,10)||0);

      // actualizar spans
      cells[8].querySelector('.input-time').textContent = formatMinToTime(current);
      const finish = current + dur;
      cells[9].querySelector('.input-time').textContent = formatMinToTime(finish);

      // espacio y turno
      tramos[idx].espacio = parseInt(cells[10].querySelector('input').value,10)||0;
      tramos[idx].turno   = cells[11].querySelector('input').value;

      current = finish + tramos[idx].espacio;
    });
  }


function updateUpDownButtons() {

  if (tramos.length === 0) return;

  // filas reales (sin la de offsets)
  const dataRows = Array.from(tbody.rows)
    .filter(r => r.id !== 'differentStartRow');
  dataRows.forEach((row, idx) => {
    const up   = row.querySelector('.btn-subir');
    const down = row.querySelector('.btn-bajar');
    // primer tramo → no subir
    up.disabled   = (idx === 0);
    // último tramo → no bajar
    down.disabled = (idx === dataRows.length - 1);
  });
}

function renderSchedule() {
  const scheduleBody = document.querySelector('.schedule-body');
  if (!scheduleBody) return;

  // 1) Parámetros de perfil
  const perfilStartMin = parseTimeToMin(horaInicioInput.value);
  const dayOffsets     = perfil.inicios_diferentes_retrasos || Array(7).fill(0);

  // 2) Hora más temprana (1h antes, truncado)
  const startHour   = Math.max(0, Math.floor(perfilStartMin / 60) - 1);
  const earliestMin = startHour * 60;

  // 3) Limpiar y recrear grid
  scheduleBody.innerHTML = '';
  for (let h = startHour; h < 24; h++) {
    // etiqueta
    const lbl = document.createElement('div');
    lbl.className = 'time-label';
    lbl.textContent = `${String(h).padStart(2,'0')}:00`;
    scheduleBody.appendChild(lbl);
    // 7 celdas
    for (let d = 0; d < 7; d++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      scheduleBody.appendChild(cell);
    }
  }

  // 4) Métricas en px
  const rowHeight    = parseFloat(getComputedStyle(scheduleBody).getPropertyValue('grid-auto-rows'));
  const timeColWidth = 60;  // coincide con tu grid-template-columns
  const dayColElem   = document.querySelector('.schedule-header .day-col');
  const dayColWidth  = dayColElem.offsetWidth;
  // inyectar variable CSS para el width de eventos
  document.documentElement.style.setProperty('--event-width', `${dayColWidth}px`);

  scheduleBody.style.position = 'relative';

  // 5) Pintar cada tramo
  tramos.forEach(tramo => {
    // altura “común” para placeholders
    const commonDur = tramo.duraciones.find(d => d > 0) || 0;
    const commonH   = (commonDur / 60) * rowHeight;

    for (let d = 0; d < 7; d++) {
      const dur = tramo.duraciones[d] || 0;

      // calcular cursor de minutos
      let cursor = perfilStartMin + dayOffsets[d];
      for (const prev of tramos) {
        if (prev.id === tramo.id) break;
        // duración “real” de este tramo (primer valor > 0)
        const commonPrevDur = prev.duraciones.find(x => x > 0) || 0;
        // si tiene clase ese día, pdur será su duración; si no, caemos a commonPrevDur
        const pdur = prev.duraciones[d] > 0
          ? prev.duraciones[d]
          : commonPrevDur;
        // avanzamos por la duración y por el espacio SIEMPRE
        cursor += pdur + (prev.espacio || 0);
      }

      // posición en px
      const topPx = (cursor - earliestMin) / 60 * rowHeight;
      const heightPx = dur > 0
        ? (dur / 60) * rowHeight
        : 0;

      // crear div
      const ev = document.createElement('div');
      ev.className = 'schedule-event ' +
        (dur > 0
          ? (tramo.lectivo ? 'lectivo' : 'descanso')
          : 'placeholder');
      ev.style.width    = `${dayColWidth + 2}px`;
      ev.style.top    = `${topPx}px`;
      ev.style.left   = `${timeColWidth + dayColWidth * d + 2}px`;
      ev.style.height = `${heightPx}px`;

      // si es placeholder, lo recolocamos tras pintar todos
      if (dur === 0) {
        // esperamos hasta que commonH esté disponible
        requestAnimationFrame(() => {
          ev.style.height = `${commonH}px`;
        });
      }

      scheduleBody.appendChild(ev);
    }
  });
};

  // ——————————————————————————————————————————————
  // 7) Lanza la primera carga
  // ——————————————————————————————————————————————
  selectPerfil(currentPerfil);


  // ——————————————————————————————————————————————
  // MENÚ “Añadir tramo…”
  // ——————————————————————————————————————————————
  const btnAddTramo = document.getElementById('btnAddTramo');
  const addTramoMenu = document.getElementById('addTramoMenu');

  btnAddTramo.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    addTramoMenu.style.display = addTramoMenu.style.display === 'block'
      ? 'none'
      : 'block';
  });

  addTramoMenu.addEventListener('click', e => {
    if (e.target.tagName !== 'LI') return;
    const tipo = e.target.dataset.tipo; // "lectivo" o "descanso"
    addTramoMenu.style.display = 'none';

    // 1) Nuevo ID
    const nextId = tramos.reduce((max, t) => Math.max(max, t.id), 0) + 1;
    // 2) Duración por defecto
    const defDur = tipo === 'lectivo' ? 60 : 30;
    // 3) Construye el tramo
    const nuevo = {
      id: nextId,
      duraciones: Array(7).fill(defDur),
      espacio: 0,
      lectivo: tipo === 'lectivo',
      turno: ''
    };
    // 4) Añade, guarda y refresca
    tramos.push(nuevo);
    saveData();
    updateAll();
  });

  // Oculta el menú al hacer click fuera
  document.addEventListener('click', () => {
    addTramoMenu.style.display = 'none';
  });




  // 9) Delegación de clicks sobre los botones de cada tramo
  tbody.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const row = btn.closest('tr');
    if (!row || row.id === 'differentStartRow') return;

    // construyo un array sólo con las filas de datos
    const dataRows = Array.from(tbody.rows)
      .filter(r => r.id !== 'differentStartRow');
    const idx  = dataRows.indexOf(row);
    const prev = idx - 1;
    const next = idx + 1;

    // helper para intercambiar propiedades (excepto id)
    function swapProps(a, b) {
      ['duraciones','espacio','lectivo','turno'].forEach(prop => {
        [a[prop], b[prop]] = [b[prop], a[prop]];
      });
    }

    if (btn.classList.contains('btn-subir') && prev >= 0) {
      swapProps(tramos[idx], tramos[prev]);
    }
    else if (btn.classList.contains('btn-bajar') && next < tramos.length) {
      swapProps(tramos[idx], tramos[next]);
    }
    else if (btn.classList.contains('btn-duplicar')) {
      // Clonar el tramo
      const original = tramos[idx];
      const copia    = JSON.parse(JSON.stringify(original));
      tramos.splice(idx + 1, 0, copia);
      // Reindexar IDs
      tramos.forEach((t,i) => t.id = i + 1);
    }
    else if (btn.classList.contains('btn-cambiar-lectivo')) {
      tramos[idx].lectivo = !tramos[idx].lectivo;
    }
    else if (btn.classList.contains('btn-eliminar')) {
      tramos.splice(idx, 1);
      // Reindexar IDs
      tramos.forEach((t,i) => t.id = i + 1);
    }
    else {
      return;
    }

    // Persistir y refrescar todo
    saveData();
    updateAll();
  });

// 10) Cambio en tabla (duraciones / espacios / turno)
tbody.addEventListener('change', e => {
  const tgt = e.target;
  const row = tgt.closest('tr');
  if (!row || row.id === 'differentStartRow') return;

  // reconstruyo sólo las filas de datos
  const dataRows = Array.from(tbody.rows).filter(r => r.id !== 'differentStartRow');
  const idx      = dataRows.indexOf(row);

  // --- DURACIONES (input-day) ---
  if (tgt.matches('.input-day')) {
    const days   = row.querySelectorAll('.input-day');
    const newVal = parseInt(tgt.value, 10) || 0;

    // si está marcada la sincronización, propaga a todos los >0
    if (chkSynchro.checked && newVal > 0) {
      days.forEach(d => {
        if (d !== tgt && (parseInt(d.value,10) || 0) > 0) {
          d.value = newVal;
        }
      });
    }

    // vuelco al JSON
    tramos[idx].duraciones = Array.from(days).map(d => parseInt(d.value,10) || 0);
  }
  // --- ESPACIO (input-space) ---
  else if (tgt.matches('.input-space')) {
    tramos[idx].espacio = parseInt(tgt.value,10) || 0;
  }
  // --- TURNO (input-turno) ---
  else if (tgt.matches('.input-turno')) {
    tramos[idx].turno = tgt.value;
  }
  else {
    return; // no nos interesa otro input
  }

  // recalcula, guarda y refresca el horario
  recalcAll();
  saveData();
  renderSchedule();
});






  // ——————————————————————————————————————————————
  // 8) Listeners de perfil-info que disparan saveData + updateAll
  // ——————————————————————————————————————————————
  chkDifferent.addEventListener('change', () => {
    // muestra/oculta la fila de retrasos
    differentRow.style.display = chkDifferent.checked
      ? 'table-row'
      : 'none';

    if (!chkDifferent.checked) {
      // 1) Poner todos los inputs a 0
      startDelayInputs.forEach(inp => inp.value = 0);
      // 2) Actualizar el array en memoria
      perfil.inicios_diferentes_retrasos = Array(7).fill(0);
      // 3) Persistir el cambio
      saveData();
      // 4) Refrescar tabla y schedule
      recalcAll();
      renderSchedule();
    } else {
      // si se vuelve a activar, simplemente persistimos
      saveData();
      updateAll();
    }
  });
  
  chkSynchro  .addEventListener('change', () => { saveData(); updateAll(); });

  perfilNombreInput.addEventListener('change', () => {
    saveData();
    updateAll();
    //  ——— Actualizar texto del botón activo ———
    const activeBtn = perfilBar.querySelector('.perfil-btn.active');
    if (activeBtn) {
      activeBtn.textContent = perfilNombreInput.value;
    }
  });

  horaInicioInput .addEventListener('change', () => { saveData(); updateAll(); });

  // referencias a los elementos del modal
  const deleteOverlay      = document.getElementById('delete-overlay');
  const deleteModal        = document.getElementById('delete-modal');
  const closeDeleteModal   = document.getElementById('closeDeleteModal');
  const cancelDelete       = document.getElementById('cancelDelete');
  const confirmDelete      = document.getElementById('confirmDelete');

  // función para mostrar el modal
  function showDeleteModal() {
    deleteOverlay.style.display = 'block';
    deleteModal.style.display   = 'block';
  }

  // función para ocultar el modal
  function hideDeleteModal() {
    deleteOverlay.style.display = 'none';
    deleteModal.style.display   = 'none';
  }

  // cuando el usuario pulse el botón “Eliminar perfil”
  btnDeletePerfil.addEventListener('click', e => {
    e.preventDefault();
    showDeleteModal();
  });

  // cerrar modal con la X o con “Cancelar”
  closeDeleteModal.addEventListener('click', hideDeleteModal);
  cancelDelete     .addEventListener('click', hideDeleteModal);
  deleteOverlay    .addEventListener('click', hideDeleteModal); // opcional: clic fuera

  // confirmar borrado
  confirmDelete.addEventListener('click', () => {
    // 1) Listamos todos los perfiles actuales
    const files = fs.readdirSync(perfilesDir)
      .filter(f => /^tramos\d{2}\.json$/.test(f))
      .sort();

    // 2) Borramos el fichero del perfil actual
    const currentFile = `tramos${String(currentPerfil).padStart(2,'0')}.json`;
    fs.unlinkSync(path.join(perfilesDir, currentFile));

    // 3) Renumeramos los que vienen después
    for (let i = currentPerfil + 1; i <= files.length; i++) {
      const oldName = `tramos${String(i).padStart(2,'0')}.json`;
      const newName = `tramos${String(i - 1).padStart(2,'0')}.json`;
      fs.renameSync(
        path.join(perfilesDir, oldName),
        path.join(perfilesDir, newName)
      );
    }

    // 4) Ajustar currentPerfil si fuera necesario
    const maxPerfil = files.length - 1;
    if (currentPerfil > maxPerfil) currentPerfil = maxPerfil;

    // 5) recarga con el nuevo perfil activo
    window.location.search = `?curso=${curso}&perfil=${currentPerfil}`;
  });

  // al arrancar, asegurarte de ocultar el modal
  hideDeleteModal();





});



