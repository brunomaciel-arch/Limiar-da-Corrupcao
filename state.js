/* ══════════════════════════════════════════════════════
   LIMIAR DA CORRUPÇÃO — state.js
   Gerenciamento de Estado, LocalStorage, CRUD, Import/Export
   ══════════════════════════════════════════════════════ */

const STORAGE_KEY = 'limiar_agents';

/* ══════════════════════════
   MODELO PADRÃO DE AGENTE
   Representa a estrutura completa de um personagem.
   Toda chave nova deve ser adicionada aqui e no
   mergeWithDefaults() para retrocompatibilidade.
══════════════════════════ */
function createDefaultAgent(name = 'Novo Agente', title = '') {
  return {
    // Metadados
    id:        generateId(),
    createdAt: Date.now(),
    updatedAt: Date.now(),

    // Aba 0 — Identidade
    name,
    title,
    focus:     '',
    age:       '',
    birthdate: '',
    history:   '',
    photo:     '',          // Base64 string

    // Aba 1 — Atributos (0–20)
    attrs: {
      raz: 0,
      ins: 0,
      pre: 0,
      prs: 0,
      fis: 0,
    },

    // Aba 1 — Status Vitais
    vidaCur:   0,
    vidaMax:   0,
    bmCur:     0,
    // bmMax é calculado dinamicamente: (raz + ins) * 5

    // Fonte
    fonteCur:  0,           // 0–10
    fonteType: 'poder',     // 'poder' | 'corrupcao' | 'adrenalina'

    // Fontes de Ação (5 hexágonos, true = ativo)
    actionSources: [false, false, false, false, false],

    // Aba 3 — Arsenal
    rd:      0,
    credits: 0,
    equipment: [],          // Array de objetos de equipamento

    // Aba 4 — Habilidades
    abilities: [],          // Array de objetos de habilidade

    // Aba 5 — Anotações
    notes: [],              // Array de objetos de nota
  };
}

/* ══════════════════════════
   MODELOS DE SUB-ITENS
══════════════════════════ */
function createEquipmentItem() {
  return {
    id:          generateId(),
    name:        '',
    description: '',
    market:      '',
    damage:      '',
    range:       '',
    price:       '',
    qty:         1,
  };
}

function createAbility() {
  return {
    id:          generateId(),
    name:        '',
    type:        'ordem',   // 'ordem' | 'ruina' | 'adrenalina'
    description: '',
    refinement:  '',
  };
}

function createNote() {
  return {
    id:      generateId(),
    title:   '',
    content: '',
  };
}

/* ══════════════════════════
   UTILITÁRIOS
══════════════════════════ */
function generateId() {
  return `agent_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Garante retrocompatibilidade: agentes salvos com versões
 * anteriores recebem os campos novos com valores padrão.
 */
function mergeWithDefaults(agent) {
  const defaults = createDefaultAgent();
  const merged   = { ...defaults, ...agent };

  // Atributos aninhados
  merged.attrs = { ...defaults.attrs, ...(agent.attrs || {}) };

  // Arrays: preservar conteúdo salvo, ou usar padrão vazio
  merged.actionSources = Array.isArray(agent.actionSources)
    ? agent.actionSources
    : defaults.actionSources;

  merged.equipment = Array.isArray(agent.equipment) ? agent.equipment : [];
  merged.abilities = Array.isArray(agent.abilities) ? agent.abilities : [];
  merged.notes     = Array.isArray(agent.notes)     ? agent.notes     : [];

  return merged;
}

/* ══════════════════════════
   CÁLCULOS DERIVADOS
══════════════════════════ */

/** Limite máximo da Barreira Mágica: (RAZ + INS) × 5 */
export function calcBmMax(agent) {
  return (agent.attrs.raz + agent.attrs.ins) * 5;
}

/**
 * Calcula o modificador de uma perícia pelo identificador de fórmula.
 * Retorna o valor inteiro arredondado para baixo (Math.floor).
 * Fórmulas híbridas usam (A + B) / 2.
 */
export function calcSkillMod(agent, formula) {
  const a = agent.attrs;
  const formulaMap = {
    fis:     a.fis,
    ins:     a.ins,
    raz:     a.raz,
    pre:     a.pre,
    prs:     a.prs,
    pre_fis: Math.floor((a.pre + a.fis) / 2),
    pre_raz: Math.floor((a.pre + a.raz) / 2),
    raz_ins: Math.floor((a.raz + a.ins) / 2),
    pre_ins: Math.floor((a.pre + a.ins) / 2),
    raz_prs: Math.floor((a.raz + a.prs) / 2),
  };
  return formulaMap[formula] ?? 0;
}

/* ══════════════════════════
   LOCALSTORAGE — LEITURA / ESCRITA
══════════════════════════ */

/** Lê todos os agentes do LocalStorage e retorna como Array. */
export function loadAllAgents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Suporte a formato legado (objeto indexado por ID)
    if (Array.isArray(parsed)) {
      return parsed.map(mergeWithDefaults);
    }
    // Objeto: converter para array
    return Object.values(parsed).map(mergeWithDefaults);
  } catch (err) {
    console.error('[State] Falha ao carregar agentes:', err);
    return [];
  }
}

/** Persiste o array completo de agentes no LocalStorage. */
function saveAllAgents(agents) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(agents));
    return true;
  } catch (err) {
    console.error('[State] Falha ao salvar agentes:', err);
    return false;
  }
}

/* ══════════════════════════
   CRUD DE AGENTES
══════════════════════════ */

/**
 * Cria um novo agente, salva no LocalStorage e retorna o objeto criado.
 * @param {string} name
 * @param {string} [title]
 * @returns {object} Agente criado
 */
export function createAgent(name, title = '') {
  const agents  = loadAllAgents();
  const newAgent = createDefaultAgent(name, title);
  agents.push(newAgent);
  saveAllAgents(agents);
  return newAgent;
}

/**
 * Busca um agente pelo ID.
 * @param {string} id
 * @returns {object|null}
 */
export function getAgent(id) {
  const agents = loadAllAgents();
  return agents.find(a => a.id === id) ?? null;
}

/**
 * Substitui o agente com o mesmo ID pelo objeto atualizado.
 * Atualiza o timestamp `updatedAt`.
 * @param {object} updatedAgent
 * @returns {boolean} Sucesso
 */
export function saveAgent(updatedAgent) {
  const agents = loadAllAgents();
  const index  = agents.findIndex(a => a.id === updatedAgent.id);
  if (index === -1) {
    console.warn('[State] Agente não encontrado para salvar:', updatedAgent.id);
    return false;
  }
  agents[index] = { ...updatedAgent, updatedAt: Date.now() };
  return saveAllAgents(agents);
}

/**
 * Remove um agente pelo ID.
 * @param {string} id
 * @returns {boolean} Sucesso
 */
export function deleteAgent(id) {
  const agents  = loadAllAgents();
  const filtered = agents.filter(a => a.id !== id);
  if (filtered.length === agents.length) {
    console.warn('[State] Agente não encontrado para deletar:', id);
    return false;
  }
  return saveAllAgents(filtered);
}

/* ══════════════════════════
   ESTADO EM MEMÓRIA (agente ativo)
   Evita múltiplas leituras do LocalStorage
   enquanto a ficha está aberta.
══════════════════════════ */

let _activeAgent = null;

/** Carrega o agente ativo na memória e retorna ele. */
export function openAgent(id) {
  _activeAgent = getAgent(id);
  return _activeAgent;
}

/** Retorna o agente atualmente aberto (pode ser null). */
export function getActiveAgent() {
  return _activeAgent;
}

/**
 * Atualiza um campo de nível raiz do agente ativo.
 * Persiste automaticamente no LocalStorage.
 * @param {string} field - Chave do campo
 * @param {*} value
 */
export function setField(field, value) {
  if (!_activeAgent) return;
  _activeAgent[field] = value;
  saveAgent(_activeAgent);
}

/**
 * Atualiza um atributo (raz, ins, pre, prs, fis).
 * Garante que o valor fique entre 0 e 20.
 * @param {string} attr
 * @param {number} value
 */
export function setAttr(attr, value) {
  if (!_activeAgent) return;
  _activeAgent.attrs[attr] = Math.max(0, Math.min(20, Number(value)));
  saveAgent(_activeAgent);
}

/**
 * Incrementa ou decrementa um atributo em 1.
 * @param {string} attr
 * @param {'inc'|'dec'} direction
 */
export function stepAttr(attr, direction) {
  if (!_activeAgent) return;
  const current = _activeAgent.attrs[attr] ?? 0;
  setAttr(attr, direction === 'inc' ? current + 1 : current - 1);
}

/**
 * Define o valor atual da Barreira Mágica.
 * Garante que não ultrapasse o bmMax calculado.
 * @param {number} value
 */
export function setBmCur(value) {
  if (!_activeAgent) return;
  const max = calcBmMax(_activeAgent);
  _activeAgent.bmCur = Math.max(0, Math.min(max, Number(value)));
  saveAgent(_activeAgent);
}

/**
 * Alterna um hexágono de Fonte de Ação (on/off).
 * @param {number} index - 0 a 4
 */
export function toggleActionSource(index) {
  if (!_activeAgent) return;
  _activeAgent.actionSources[index] = !_activeAgent.actionSources[index];
  saveAgent(_activeAgent);
}

/**
 * Define a Fonte atual (0–10).
 * @param {number} value
 */
export function setFonteCur(value) {
  if (!_activeAgent) return;
  _activeAgent.fonteCur = Math.max(0, Math.min(10, Number(value)));
  saveAgent(_activeAgent);
}

/* ══════════════════════════
   EQUIPAMENTOS
══════════════════════════ */

export function addEquipment() {
  if (!_activeAgent) return null;
  const item = createEquipmentItem();
  _activeAgent.equipment.push(item);
  saveAgent(_activeAgent);
  return item;
}

export function updateEquipmentField(itemId, field, value) {
  if (!_activeAgent) return;
  const item = _activeAgent.equipment.find(e => e.id === itemId);
  if (item) {
    item[field] = value;
    saveAgent(_activeAgent);
  }
}

export function removeEquipment(itemId) {
  if (!_activeAgent) return;
  _activeAgent.equipment = _activeAgent.equipment.filter(e => e.id !== itemId);
  saveAgent(_activeAgent);
}

/* ══════════════════════════
   HABILIDADES
══════════════════════════ */

export function addAbility() {
  if (!_activeAgent) return null;
  const ability = createAbility();
  _activeAgent.abilities.push(ability);
  saveAgent(_activeAgent);
  return ability;
}

export function updateAbilityField(abilityId, field, value) {
  if (!_activeAgent) return;
  const ability = _activeAgent.abilities.find(a => a.id === abilityId);
  if (ability) {
    ability[field] = value;
    saveAgent(_activeAgent);
  }
}

export function removeAbility(abilityId) {
  if (!_activeAgent) return;
  _activeAgent.abilities = _activeAgent.abilities.filter(a => a.id !== abilityId);
  saveAgent(_activeAgent);
}

/* ══════════════════════════
   ANOTAÇÕES
══════════════════════════ */

export function addNote() {
  if (!_activeAgent) return null;
  const note = createNote();
  _activeAgent.notes.push(note);
  saveAgent(_activeAgent);
  return note;
}

export function updateNoteField(noteId, field, value) {
  if (!_activeAgent) return;
  const note = _activeAgent.notes.find(n => n.id === noteId);
  if (note) {
    note[field] = value;
    saveAgent(_activeAgent);
  }
}

export function removeNote(noteId) {
  if (!_activeAgent) return;
  _activeAgent.notes = _activeAgent.notes.filter(n => n.id !== noteId);
  saveAgent(_activeAgent);
}

/* ══════════════════════════
   IMPORT / EXPORT
══════════════════════════ */

/**
 * Exporta o agente ativo (ou um agente pelo ID) como arquivo .json.
 * @param {string} [id] - Se omitido, usa o agente ativo.
 */
export function exportAgent(id) {
  const agent = id ? getAgent(id) : _activeAgent;
  if (!agent) {
    console.warn('[State] Nenhum agente para exportar.');
    return;
  }

  const filename = `${sanitizeFilename(agent.name)}_limiar.json`;
  const json     = JSON.stringify(agent, null, 2);
  const blob     = new Blob([json], { type: 'application/json' });
  const url      = URL.createObjectURL(blob);

  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();

  // Limpar URL temporária após o download
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Importa um agente a partir de um objeto JSON (já parseado).
 * Verifica se o ID já existe:
 *   - Se sim: pergunta ao usuário se deseja substituir (via callback).
 *   - Se não: adiciona normalmente.
 *
 * @param {object} rawData - Objeto JSON do agente
 * @param {{ onConflict: (existingName: string) => boolean }} [options]
 * @returns {{ success: boolean, agent: object|null, conflict: boolean }}
 */
export function importAgent(rawData, options = {}) {
  if (!rawData || typeof rawData !== 'object') {
    return { success: false, agent: null, conflict: false };
  }

  const agent   = mergeWithDefaults(rawData);
  const agents  = loadAllAgents();
  const existing = agents.findIndex(a => a.id === agent.id);

  if (existing !== -1) {
    const existingName = agents[existing].name;

    // Chama o callback para resolver conflito (retorna true = substituir)
    const shouldReplace = options.onConflict
      ? options.onConflict(existingName)
      : false;

    if (shouldReplace) {
      agents[existing] = { ...agent, updatedAt: Date.now() };
      saveAllAgents(agents);
      return { success: true, agent: agents[existing], conflict: true };
    } else {
      // Gera novo ID para não sobrescrever
      agent.id = generateId();
      agents.push(agent);
      saveAllAgents(agents);
      return { success: true, agent, conflict: false };
    }
  }

  agents.push(agent);
  saveAllAgents(agents);
  return { success: true, agent, conflict: false };
}

/**
 * Lê um File (.json) e chama importAgent.
 * @param {File} file
 * @param {object} [options] - Passado para importAgent
 * @returns {Promise<{ success: boolean, agent: object|null, conflict: boolean }>}
 */
export async function importAgentFromFile(file, options = {}) {
  return new Promise((resolve) => {
    if (!file || file.type !== 'application/json') {
      resolve({ success: false, agent: null, conflict: false });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data   = JSON.parse(e.target.result);
        const result = importAgent(data, options);
        resolve(result);
      } catch (err) {
        console.error('[State] Erro ao parsear JSON:', err);
        resolve({ success: false, agent: null, conflict: false });
      }
    };
    reader.onerror = () => resolve({ success: false, agent: null, conflict: false });
    reader.readAsText(file);
  });
}

/* ══════════════════════════
   HELPERS INTERNOS
══════════════════════════ */

function sanitizeFilename(name) {
  return (name || 'agente')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // Remove acentos
    .replace(/[^a-zA-Z0-9_-]/g, '_') // Substitui caracteres especiais
    .toLowerCase()
    .slice(0, 60);
}
