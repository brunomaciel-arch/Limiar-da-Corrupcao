/* ══════════════════════════════════════════════════════
   LIMIAR DA CORRUPÇÃO — ui.js
   Controlador de Interface: Roster, Ficha, Abas, Bindings
   ══════════════════════════════════════════════════════ */

import {
  loadAllAgents,
  createAgent,
  deleteAgent,
  openAgent,
  getActiveAgent,
  saveAgent,
  setField,
  setAttr,
  stepAttr,
  setBmCur,
  setFonteCur,
  toggleActionSource,
  calcBmMax,
  calcSkillMod,
  exportAgent,
  importAgentFromFile,
  addEquipment,
  updateEquipmentField,
  removeEquipment,
  addAbility,
  updateAbilityField,
  removeAbility,
  addNote,
  updateNoteField,
  removeNote,
} from './state.js';

/* ══════════════════════════
   REFERÊNCIAS DOM
══════════════════════════ */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const views = {
  roster: $('#view-roster'),
  sheet:  $('#view-sheet'),
};

/* ══════════════════════════
   TOAST
══════════════════════════ */
export function showToast(message, type = '') {
  const container = $('#toast-container');
  const toast = document.createElement('div');
  toast.className = `toast${type ? ` toast--${type}` : ''}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

/* ══════════════════════════
   NAVEGAÇÃO DE VIEWS
══════════════════════════ */
export function showView(name) {
  Object.entries(views).forEach(([key, el]) => {
    el.classList.toggle('active', key === name);
  });
}

/* ══════════════════════════════════════════════
   ROSTER — Central de Agentes
══════════════════════════════════════════════ */
export function renderRoster() {
  const grid   = $('#roster-grid');
  const empty  = $('#roster-empty');
  const agents = loadAllAgents();

  // Limpar cards existentes (preservar o empty placeholder)
  $$('.agent-card', grid).forEach(c => c.remove());

  if (agents.length === 0) {
    empty.style.display = '';
    return;
  }

  empty.style.display = 'none';

  agents.forEach(agent => {
    const card = buildAgentCard(agent);
    grid.appendChild(card);
  });
}

function buildAgentCard(agent) {
  const bmMax   = calcBmMax(agent);
  const vidaPct = agent.vidaMax > 0
    ? Math.min(100, (agent.vidaCur / agent.vidaMax) * 100)
    : 0;
  const bmPct = bmMax > 0
    ? Math.min(100, (agent.bmCur / bmMax) * 100)
    : 0;
  const fontePct = (agent.fonteCur / 10) * 100;

  const card = document.createElement('div');
  card.className   = 'agent-card';
  card.dataset.id  = agent.id;

  // Foto ou placeholder
  const photoHtml = agent.photo
    ? `<img class="agent-card__photo" src="${agent.photo}" alt="${escapeHtml(agent.name)}" />`
    : `<div class="agent-card__photo-placeholder">◈</div>`;

  card.innerHTML = `
    ${photoHtml}
    <div class="agent-card__body">
      <p class="agent-card__name">${escapeHtml(agent.name)}</p>
      <p class="agent-card__title">${escapeHtml(agent.title || '—')}</p>
      <div class="agent-card__bars">
        <div class="agent-card__bar-row">
          <span class="agent-card__bar-label">VID</span>
          <div class="agent-card__bar-track">
            <div class="agent-card__bar-fill agent-card__bar-fill--green"
                 style="width:${vidaPct}%"></div>
          </div>
          <span class="agent-card__bar-vals">${agent.vidaCur}/${agent.vidaMax}</span>
        </div>
        <div class="agent-card__bar-row">
          <span class="agent-card__bar-label">BM</span>
          <div class="agent-card__bar-track">
            <div class="agent-card__bar-fill agent-card__bar-fill--cyan"
                 style="width:${bmPct}%"></div>
          </div>
          <span class="agent-card__bar-vals">${agent.bmCur}/${bmMax}</span>
        </div>
        <div class="agent-card__bar-row">
          <span class="agent-card__bar-label">FON</span>
          <div class="agent-card__bar-track">
            <div class="agent-card__bar-fill agent-card__bar-fill--magenta"
                 style="width:${fontePct}%"></div>
          </div>
          <span class="agent-card__bar-vals">${agent.fonteCur}/10</span>
        </div>
      </div>
    </div>
    <button class="agent-card__delete" data-delete-id="${agent.id}" title="Deletar agente">✕</button>
  `;

  // Abrir ficha ao clicar no card (exceto no botão de delete)
  card.addEventListener('click', (e) => {
    if (e.target.closest('.agent-card__delete')) return;
    openSheet(agent.id);
  });

  // Botão de delete no card
  card.querySelector('.agent-card__delete').addEventListener('click', (e) => {
    e.stopPropagation();
    showDeleteModal(agent.id, agent.name);
  });

  return card;
}

/* ══════════════════════════════════════════════
   FICHA — Abrir / Fechar
══════════════════════════════════════════════ */
export function openSheet(id) {
  const agent = openAgent(id);
  if (!agent) { showToast('Agente não encontrado.', 'error'); return; }

  // Atualizar header
  $('#sheet-agent-name').textContent  = agent.name  || '—';
  $('#sheet-agent-title').textContent = agent.title || '—';

  // Preencher todas as abas
  populateTab0(agent);
  populateTab1(agent);
  populateTab2(agent);
  populateTab3(agent);
  populateTab4(agent);
  populateTab5(agent);

  // Ativar aba 0
  activateTab(0);

  showView('sheet');
  window.scrollTo({ top: 0, behavior: 'instant' });
}

export function closeSheet() {
  showView('roster');
  renderRoster();
}

/* ══════════════════════════════════════════════
   NAVEGAÇÃO POR ABAS
══════════════════════════════════════════════ */
export function activateTab(index) {
  $$('.tab').forEach(t => t.classList.toggle('active', Number(t.dataset.tab) === index));
  $$('.tab-panel').forEach(p => p.classList.toggle('active', Number(p.dataset.panel) === index));
}

/* ══════════════════════════════════════════════
   ABA 0 — ID DO AGENTE
══════════════════════════════════════════════ */
function populateTab0(agent) {
  // Foto
  const photoEl = $('#agent-photo');
  photoEl.src = agent.photo || '';
  photoEl.style.display = agent.photo ? 'block' : 'none';

  // Campos de texto simples
  const textFields = ['name', 'title', 'focus', 'age', 'birthdate', 'history'];
  textFields.forEach(field => {
    const el = $(`[data-field="${field}"]`);
    if (el) el.value = agent[field] ?? '';
  });

  // Resumo lateral
  updateSummary(agent);
}

function updateSummary(agent) {
  const bmMax = calcBmMax(agent);

  // Barras
  const vidaPct = agent.vidaMax > 0
    ? Math.min(100, (agent.vidaCur / agent.vidaMax) * 100) : 0;
  const bmPct = bmMax > 0
    ? Math.min(100, (agent.bmCur / bmMax) * 100) : 0;

  $('#summary-vida-fill').style.width = `${vidaPct}%`;
  $('#summary-bm-fill').style.width   = `${bmPct}%`;
  $('#summary-vida-cur').textContent  = agent.vidaCur;
  $('#summary-vida-max').textContent  = agent.vidaMax;
  $('#summary-bm-cur').textContent    = agent.bmCur;
  $('#summary-bm-max').textContent    = bmMax;

  // Pips de fonte (resumo)
  const pipsContainer = $('#summary-fonte-pips');
  pipsContainer.innerHTML = '';
  for (let i = 0; i < 10; i++) {
    const pip = document.createElement('span');
    pip.className = `pip${i < agent.fonteCur ? ' active' : ''}`;
    pipsContainer.appendChild(pip);
  }

  // Atributos mini
  ['raz','ins','pre','prs','fis'].forEach(attr => {
    const el = $(`#sum-${attr}`);
    if (el) el.textContent = agent.attrs[attr] ?? 0;
  });
}

/* ══════════════════════════════════════════════
   ABA 1 — STATUS / ATRIBUTOS
══════════════════════════════════════════════ */
function populateTab1(agent) {
  // Atributos
  ['raz','ins','pre','prs','fis'].forEach(attr => {
    const valEl = $(`#attr-${attr}`);
    const barEl = $(`#attr-bar-${attr}`);
    if (valEl) valEl.textContent = agent.attrs[attr];
    if (barEl) barEl.style.width = `${(agent.attrs[attr] / 20) * 100}%`;
  });

  // Vida
  $('#vida-cur').value = agent.vidaCur;
  $('#vida-max').value = agent.vidaMax;
  updateVidaBar(agent);

  // Barreira Mágica
  const bmMax = calcBmMax(agent);
  $('#bm-cur').value                    = agent.bmCur;
  $('#bm-max-display').textContent      = bmMax;
  $('#bm-formula-result').textContent   = bmMax;
  updateBmBar(agent);

  // Fonte
  $('#fonte-type').value = agent.fonteType || 'poder';
  renderFontePips(agent);

  // Hexágonos de Fontes de Ação
  $$('.hex-pip').forEach((hex, i) => {
    hex.classList.toggle('active', agent.actionSources[i] === true);
  });
}

function updateVidaBar(agent) {
  const pct = agent.vidaMax > 0
    ? Math.min(100, (agent.vidaCur / agent.vidaMax) * 100) : 0;
  $('#bar-vida').style.width = `${pct}%`;
}

function updateBmBar(agent) {
  const bmMax = calcBmMax(agent);
  const pct   = bmMax > 0
    ? Math.min(100, (agent.bmCur / bmMax) * 100) : 0;
  $('#bar-bm').style.width              = `${pct}%`;
  $('#bm-max-display').textContent      = bmMax;
  $('#bm-formula-result').textContent   = bmMax;
}

function renderFontePips(agent) {
  const container = $('#fonte-pips-big');
  container.innerHTML = '';
  for (let i = 0; i < 10; i++) {
    const btn = document.createElement('button');
    btn.className = `fonte-pip-btn${i < agent.fonteCur ? ' active' : ''}`;
    btn.dataset.index = i;
    btn.textContent   = i + 1;
    btn.title         = `Fonte ${i + 1}`;
    btn.addEventListener('click', () => {
      // Clicar no pip já ativo desativa ele (e todos acima)
      const newVal = i < agent.fonteCur ? i : i + 1;
      setFonteCur(newVal);
      const updated = getActiveAgent();
      renderFontePips(updated);
      updateSummary(updated);
    });
    container.appendChild(btn);
  }
}

/* ══════════════════════════════════════════════
   ABA 2 — PERÍCIAS
══════════════════════════════════════════════ */
function populateTab2(agent) {
  // Cabeçalhos com valor do atributo
  ['raz','ins','pre','prs','fis'].forEach(attr => {
    const el = $(`#skill-header-${attr}`);
    if (el) el.textContent = agent.attrs[attr];
  });

  // Cada skill row: atualizar total exibido
  $$('.skill-row[data-formula]').forEach(row => {
    const formula  = row.dataset.formula;
    const skillId  = row.dataset.skill;
    const totalEl  = $(`#skill-val-${skillId}`);
    if (totalEl) totalEl.textContent = calcSkillMod(agent, formula);
  });
}

/* ══════════════════════════════════════════════
   ABA 3 — ARSENAL
══════════════════════════════════════════════ */
function populateTab3(agent) {
  $('#rd-val').value      = agent.rd ?? 0;
  $('#credits-val').value = agent.credits ?? 0;

  renderEquipmentTable(agent);
}

export function renderEquipmentTable(agent) {
  const tbody  = $('#equipment-body');
  const empty  = $('#equipment-empty');
  tbody.innerHTML = '';

  if (!agent.equipment || agent.equipment.length === 0) {
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';

  agent.equipment.forEach(item => {
    tbody.appendChild(buildEquipmentRow(item));
  });
}

function buildEquipmentRow(item) {
  const tr = document.createElement('tr');
  tr.dataset.equipId = item.id;

  const fields = [
    { key: 'name',        cls: '',      placeholder: 'Nome...' },
    { key: 'description', cls: '',      placeholder: 'Descrição...' },
    { key: 'market',      cls: '--sm',  placeholder: '—' },
    { key: 'damage',      cls: '--sm',  placeholder: '—' },
    { key: 'range',       cls: '--sm',  placeholder: '—' },
    { key: 'price',       cls: '--sm',  placeholder: '—' },
    { key: 'qty',         cls: '--xs',  placeholder: '1', type: 'number' },
  ];

  fields.forEach(f => {
    const td    = document.createElement('td');
    const input = document.createElement('input');
    input.className   = `eq-input eq-input${f.cls}`;
    input.type        = f.type || 'text';
    input.value       = item[f.key] ?? '';
    input.placeholder = f.placeholder;
    input.addEventListener('change', () => {
      updateEquipmentField(item.id, f.key, input.value);
    });
    td.appendChild(input);
    tr.appendChild(td);
  });

  // Botão remover
  const tdBtn = document.createElement('td');
  const btn   = document.createElement('button');
  btn.className   = 'btn-remove-row';
  btn.textContent = '✕';
  btn.title       = 'Remover item';
  btn.addEventListener('click', () => {
    removeEquipment(item.id);
    tr.remove();
    const agent = getActiveAgent();
    if (agent.equipment.length === 0) {
      $('#equipment-empty').style.display = '';
    }
  });
  tdBtn.appendChild(btn);
  tr.appendChild(tdBtn);

  return tr;
}

/* ══════════════════════════════════════════════
   ABA 4 — HABILIDADES
══════════════════════════════════════════════ */
function populateTab4(agent) {
  const grid  = $('#abilities-grid');
  const empty = $('#abilities-empty');

  // Limpar cards existentes
  $$('.ability-card', grid).forEach(c => c.remove());

  if (!agent.abilities || agent.abilities.length === 0) {
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';

  agent.abilities.forEach(ability => {
    grid.insertBefore(buildAbilityCard(ability), empty);
  });
}

function buildAbilityCard(ability) {
  const card = document.createElement('div');
  card.className        = 'ability-card';
  card.dataset.abilityId = ability.id;
  card.dataset.type      = ability.type || 'ordem';

  card.innerHTML = `
    <div class="ability-card__header">
      <input class="ability-name-input" type="text"
             placeholder="Nome da habilidade..."
             value="${escapeHtml(ability.name || '')}" />
      <select class="ability-type-select">
        <option value="ordem"      ${ability.type === 'ordem'      ? 'selected' : ''}>Ordem</option>
        <option value="ruina"      ${ability.type === 'ruina'      ? 'selected' : ''}>Ruína</option>
        <option value="adrenalina" ${ability.type === 'adrenalina' ? 'selected' : ''}>Adrenalina</option>
      </select>
    </div>
    <p class="ability-label">Descrição da Técnica</p>
    <textarea class="ability-textarea" rows="3"
              placeholder="Descreva o efeito...">${escapeHtml(ability.description || '')}</textarea>
    <p class="ability-label">Refinamento</p>
    <textarea class="ability-textarea" rows="2"
              placeholder="Melhoria ou variação...">${escapeHtml(ability.refinement || '')}</textarea>
    <button class="ability-remove" title="Remover habilidade">✕</button>
  `;

  // Bindings
  const nameInput  = card.querySelector('.ability-name-input');
  const typeSelect = card.querySelector('.ability-type-select');
  const [descArea, refArea] = card.querySelectorAll('.ability-textarea');
  const removeBtn  = card.querySelector('.ability-remove');

  nameInput.addEventListener('input', () => {
    updateAbilityField(ability.id, 'name', nameInput.value);
  });
  typeSelect.addEventListener('change', () => {
    card.dataset.type = typeSelect.value;
    updateAbilityField(ability.id, 'type', typeSelect.value);
  });
  descArea.addEventListener('input', () => {
    updateAbilityField(ability.id, 'description', descArea.value);
  });
  refArea.addEventListener('input', () => {
    updateAbilityField(ability.id, 'refinement', refArea.value);
  });
  removeBtn.addEventListener('click', () => {
    removeAbility(ability.id);
    card.remove();
    const agent = getActiveAgent();
    if (agent.abilities.length === 0) {
      $('#abilities-empty').style.display = '';
    }
  });

  return card;
}

/* ══════════════════════════════════════════════
   ABA 5 — ANOTAÇÕES
══════════════════════════════════════════════ */
function populateTab5(agent) {
  const grid  = $('#notes-grid');
  const empty = $('#notes-empty');

  $$('.note-block', grid).forEach(b => b.remove());

  if (!agent.notes || agent.notes.length === 0) {
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';

  agent.notes.forEach(note => {
    grid.insertBefore(buildNoteBlock(note), empty);
  });
}

function buildNoteBlock(note) {
  const block = document.createElement('div');
  block.className    = 'note-block';
  block.dataset.noteId = note.id;

  block.innerHTML = `
    <input class="note-title-input" type="text"
           placeholder="Título da anotação..."
           value="${escapeHtml(note.title || '')}" />
    <textarea class="note-content-textarea"
              placeholder="Escreva suas anotações...">${escapeHtml(note.content || '')}</textarea>
    <button class="note-remove" title="Remover bloco">✕</button>
  `;

  const titleInput   = block.querySelector('.note-title-input');
  const contentArea  = block.querySelector('.note-content-textarea');
  const removeBtn    = block.querySelector('.note-remove');

  titleInput.addEventListener('input', () => {
    updateNoteField(note.id, 'title', titleInput.value);
  });
  contentArea.addEventListener('input', () => {
    updateNoteField(note.id, 'content', contentArea.value);
  });
  removeBtn.addEventListener('click', () => {
    removeNote(note.id);
    block.remove();
    const agent = getActiveAgent();
    if (agent.notes.length === 0) {
      $('#notes-empty').style.display = '';
    }
  });

  return block;
}

/* ══════════════════════════════════════════════
   MODAIS
══════════════════════════════════════════════ */

// ── Modal: Novo Agente ──
export function showNewAgentModal() {
  $('#new-agent-name').value  = '';
  $('#new-agent-title').value = '';
  $('#modal-new-agent').hidden = false;
  $('#new-agent-name').focus();
}
export function hideNewAgentModal() {
  $('#modal-new-agent').hidden = true;
}

// ── Modal: Confirmar Delete ──
let _pendingDeleteId = null;
export function showDeleteModal(id, name) {
  _pendingDeleteId = id;
  $('#delete-agent-name-display').textContent = name || 'este agente';
  $('#modal-confirm-delete').hidden = false;
}
export function hideDeleteModal() {
  _pendingDeleteId = null;
  $('#modal-confirm-delete').hidden = true;
}
export function confirmDelete() {
  if (!_pendingDeleteId) return;

  const isOnSheet = (getActiveAgent()?.id === _pendingDeleteId);

  deleteAgent(_pendingDeleteId);
  hideDeleteModal();
  showToast('Agente deletado.', 'success');

  if (isOnSheet) {
    closeSheet();
  } else {
    renderRoster();
  }
  _pendingDeleteId = null;
}

/* ══════════════════════════════════════════════
   BINDINGS GLOBAIS DA FICHA
   Todos os eventos persistentes que não dependem
   de qual agente está aberto.
══════════════════════════════════════════════ */
export function bindSheetEvents() {

  // ── Tabs ──
  $$('.tab').forEach(tab => {
    tab.addEventListener('click', () => activateTab(Number(tab.dataset.tab)));
  });

  // ── Voltar ao roster ──
  $('#btn-back').addEventListener('click', closeSheet);

  // ── Exportar ──
  $('#btn-export').addEventListener('click', () => {
    exportAgent();
    showToast('Ficha exportada!', 'success');
  });

  // ── Deletar (dentro da ficha) ──
  $('#btn-delete-agent').addEventListener('click', () => {
    const agent = getActiveAgent();
    if (agent) showDeleteModal(agent.id, agent.name);
  });

  // ── ABA 0: upload de foto ──
  $('#photo-wrapper').addEventListener('click', () => $('#photo-input').click());
  $('#photo-input').addEventListener('change', handlePhotoUpload);

  // ── ABA 0: campos de texto (input/textarea) ──
  $$('[data-field]', $('#view-sheet')).forEach(el => {
    const event = el.tagName === 'TEXTAREA' ? 'input' : 'change';
    el.addEventListener(event, () => {
      const field = el.dataset.field;
      if (!field) return;

      // Campos numéricos
      const numFields = ['vidaCur','vidaMax','bmCur','rd','credits'];
      const val = numFields.includes(field) ? Number(el.value) : el.value;

      setField(field, val);

      const agent = getActiveAgent();

      // Recalculos dependentes
      if (field === 'vidaCur' || field === 'vidaMax') {
        updateVidaBar(agent);
        updateSummary(agent);
      }
      if (field === 'bmCur') {
        setBmCur(val);
        updateBmBar(agent);
        updateSummary(agent);
      }
      if (field === 'name') {
        $('#sheet-agent-name').textContent = val || '—';
      }
      if (field === 'title') {
        $('#sheet-agent-title').textContent = val || '—';
      }
    });
  });

  // ── ABA 1: steppers de atributos ──
  $$('.stepper-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target    = btn.dataset.target;
      const direction = btn.dataset.action;
      stepAttr(target, direction);
      const agent = getActiveAgent();

      // Atualizar display do atributo
      $(`#attr-${target}`).textContent  = agent.attrs[target];
      $(`#attr-bar-${target}`).style.width = `${(agent.attrs[target] / 20) * 100}%`;

      // BM depende de RAZ e INS
      if (target === 'raz' || target === 'ins') {
        updateBmBar(agent);
        // Garantir que bmCur não ultrapasse o novo bmMax
        const newMax = calcBmMax(agent);
        if (agent.bmCur > newMax) {
          setBmCur(newMax);
          $('#bm-cur').value = newMax;
          updateBmBar(getActiveAgent());
        }
      }

      // Atualizar resumo da Aba 0
      updateSummary(agent);

      // Atualizar cabeçalhos e totais de perícias
      populateTab2(agent);
    });
  });

  // ── ABA 1: contadores de RD e Créditos ──
  $$('.counter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      const field  = target === 'rd' ? 'rd' : 'credits';
      const inputEl = target === 'rd' ? $('#rd-val') : $('#credits-val');
      const current = Number(inputEl.value) || 0;
      const next    = btn.dataset.action === 'inc' ? current + 1 : Math.max(0, current - 1);
      inputEl.value = next;
      setField(field, next);
    });
  });

  // ── ABA 1: hexágonos de Fontes de Ação ──
  $$('.hex-pip').forEach(hex => {
    hex.addEventListener('click', () => {
      const index = Number(hex.dataset.index);
      toggleActionSource(index);
      const agent = getActiveAgent();
      hex.classList.toggle('active', agent.actionSources[index]);
    });
  });

  // ── ABA 1: tipo de fonte ──
  $('#fonte-type').addEventListener('change', (e) => {
    setField('fonteType', e.target.value);
  });

  // ── ABA 3: adicionar equipamento ──
  $('#btn-add-equipment').addEventListener('click', () => {
    const item  = addEquipment();
    const tbody = $('#equipment-body');
    const empty = $('#equipment-empty');
    empty.style.display = 'none';
    tbody.appendChild(buildEquipmentRow(item));
  });

  // ── ABA 4: adicionar habilidade ──
  $('#btn-add-ability').addEventListener('click', () => {
    const ability = addAbility();
    const grid    = $('#abilities-grid');
    const empty   = $('#abilities-empty');
    empty.style.display = 'none';
    grid.insertBefore(buildAbilityCard(ability), empty);
  });

  // ── ABA 5: adicionar nota ──
  $('#btn-add-note').addEventListener('click', () => {
    const note  = addNote();
    const grid  = $('#notes-grid');
    const empty = $('#notes-empty');
    empty.style.display = 'none';
    grid.insertBefore(buildNoteBlock(note), empty);
  });
}

/* ══════════════════════════════════════════════
   BINDINGS DO ROSTER
══════════════════════════════════════════════ */
export function bindRosterEvents() {

  // ── Novo agente ──
  $('#btn-new-agent').addEventListener('click', showNewAgentModal);
  $('#modal-close-new').addEventListener('click', hideNewAgentModal);
  $('#modal-cancel-new').addEventListener('click', hideNewAgentModal);
  $('#modal-new-agent').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) hideNewAgentModal();
  });

  $('#modal-confirm-new').addEventListener('click', () => {
    const name  = $('#new-agent-name').value.trim();
    const title = $('#new-agent-title').value.trim();
    if (!name) {
      $('#new-agent-name').focus();
      showToast('Informe um nome para o agente.', 'error');
      return;
    }
    const agent = createAgent(name, title);
    hideNewAgentModal();
    openSheet(agent.id);
  });

  // Enter no modal cria o agente
  $('#new-agent-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('#modal-confirm-new').click();
  });

  // ── Delete modal ──
  $('#modal-close-delete').addEventListener('click', hideDeleteModal);
  $('#modal-cancel-delete').addEventListener('click', hideDeleteModal);
  $('#modal-confirm-delete').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) hideDeleteModal();
  });
  $('#modal-confirm-delete-btn').addEventListener('click', confirmDelete);

  // ── Importar ──
  $('#btn-import').addEventListener('click', () => $('#import-file-input').click());
  $('#import-file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const result = await importAgentFromFile(file, {
      onConflict: (existingName) =>
        confirm(`Já existe um agente chamado "${existingName}" com o mesmo ID.\n\nDeseja substituí-lo?`),
    });

    // Limpar input para permitir reimportar o mesmo arquivo
    e.target.value = '';

    if (!result.success) {
      showToast('Erro ao importar: arquivo inválido.', 'error');
      return;
    }

    showToast(
      result.conflict
        ? `"${result.agent.name}" substituído com sucesso!`
        : `"${result.agent.name}" importado com sucesso!`,
      'success'
    );
    renderRoster();
  });
}

/* ══════════════════════════════════════════════
   UPLOAD DE FOTO
══════════════════════════════════════════════ */
function handlePhotoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    const base64 = ev.target.result;
    setField('photo', base64);

    const photoEl = $('#agent-photo');
    photoEl.src           = base64;
    photoEl.style.display = 'block';

    showToast('Foto atualizada!', 'success');
  };
  reader.readAsDataURL(file);

  // Limpar input
  e.target.value = '';
}

/* ══════════════════════════════════════════════
   HELPER: escape HTML
══════════════════════════════════════════════ */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
