/* ══════════════════════════════════════════════════════
   LIMIAR DA CORRUPÇÃO — dice.js
   Motor de Rolagem 2d10, Pop-up Animado
   ══════════════════════════════════════════════════════ */

import { getActiveAgent, calcSkillMod } from './state.js';

/* ══════════════════════════
   REFERÊNCIAS DOM
══════════════════════════ */
const popup      = document.getElementById('dice-popup');
const elSkill    = document.getElementById('dice-popup-skill');
const elD1       = document.getElementById('dice-d1');
const elD2       = document.getElementById('dice-d2');
const elMod      = document.getElementById('dice-mod');
const elTotal    = document.getElementById('dice-total');

let _closeTimer  = null;   // Timeout para fechar o pop-up automaticamente
let _isRolling   = false;  // Trava contra spam de cliques

/* ══════════════════════════
   GERADOR DE DADO
══════════════════════════ */

/** Retorna um inteiro aleatório entre min e max (inclusive). */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Rola 2d10 e retorna { d1, d2, sum }. */
function roll2d10() {
  const d1 = randInt(1, 10);
  const d2 = randInt(1, 10);
  return { d1, d2, sum: d1 + d2 };
}

/* ══════════════════════════
   ANIMAÇÃO DO POP-UP
══════════════════════════ */

/**
 * Exibe o pop-up de rolagem com animação de "sorteio" nos dados.
 *
 * @param {string} skillName  - Nome legível da perícia
 * @param {string} formula    - Chave de fórmula ('fis', 'raz_ins', etc.)
 */
export function showRoll(skillName, formula) {
  if (_isRolling) return;
  _isRolling = true;

  const agent = getActiveAgent();
  const mod   = agent ? calcSkillMod(agent, formula) : 0;

  // Cancelar timer anterior se o usuário rolar de novo antes de fechar
  if (_closeTimer) {
    clearTimeout(_closeTimer);
    _closeTimer = null;
  }

  // Mostrar pop-up imediatamente (sem [hidden])
  popup.removeAttribute('hidden');
  popup.classList.remove('active');

  // Forçar reflow para a transição CSS funcionar
  void popup.offsetWidth;

  elSkill.textContent = skillName.toUpperCase();
  elMod.textContent   = mod >= 0 ? `+${mod}` : `${mod}`;

  // ── Fase 1: animação de "sorteio" (números piscando) ──
  const FRAMES      = 10;
  const FRAME_MS    = 60;
  let   frameCount  = 0;

  popup.classList.add('active');

  const ticker = setInterval(() => {
    elD1.textContent = randInt(1, 10);
    elD2.textContent = randInt(1, 10);
    elTotal.textContent = '?';
    frameCount++;

    if (frameCount >= FRAMES) {
      clearInterval(ticker);

      // ── Fase 2: resultado final ──
      const { d1, d2, sum } = roll2d10();
      const total = sum + mod;

      elD1.textContent    = d1;
      elD2.textContent    = d2;
      elTotal.textContent = total;

      // Colorir total por faixa
      elTotal.style.color = getTotalColor(total);

      _isRolling = false;

      // Fechar automaticamente após 4 segundos
      _closeTimer = setTimeout(hideRoll, 4000);
    }
  }, FRAME_MS);
}

/**
 * Fecha o pop-up de rolagem.
 */
export function hideRoll() {
  popup.classList.remove('active');
  // Espera a transição CSS terminar para esconder de verdade
  setTimeout(() => {
    popup.setAttribute('hidden', '');
  }, 220);
  if (_closeTimer) {
    clearTimeout(_closeTimer);
    _closeTimer = null;
  }
  _isRolling = false;
}

/**
 * Retorna uma cor CSS baseada no total da rolagem.
 * Escala heurística para 2d10 + modificador (máx ~40).
 */
function getTotalColor(total) {
  if (total <= 5)  return 'var(--red)';
  if (total <= 10) return 'var(--text-mid)';
  if (total <= 18) return 'var(--text-bright)';
  if (total <= 25) return 'var(--cyan)';
  return 'var(--gold)';
}

/* ══════════════════════════
   BINDING DE PERÍCIAS
   Conecta todos os .skill-row ao showRoll().
   Chamado uma vez pelo app.js após o DOM estar pronto.
══════════════════════════ */
export function bindSkillRolls() {
  // Mapa de skill-id → nome legível
  const skillNames = {
    'atletismo':          'Atletismo',
    'forca':              'Força',
    'resistencia-fisica': 'Resistência Física',
    'sobrevivencia':      'Sobrevivência',
    'intuicao':           'Intuição',
    'percepcao':          'Percepção',
    'tecnologia':         'Tecnologia',
    'raciocinio':         'Raciocínio',
    'prestidigitacao':    'Prestidigitação',
    'furtividade':        'Furtividade',
    'engano':             'Engano',
    'presenca-skill':     'Presença',
    'redirecionamento':   'Redirecionamento',
    'medicina':           'Medicina',
    'confeccao':          'Confecção e Reparo',
    'resistencia-mental': 'Resistência Mental',
    'concentracao':       'Concentração',
    'agilidade':          'Agilidade',
    'investigacao':       'Investigação',
    'negociacao':         'Negociação',
  };

  document.querySelectorAll('.skill-row[data-skill]').forEach(row => {
    row.addEventListener('click', () => {
      const skillId = row.dataset.skill;
      const formula = row.dataset.formula;
      const name    = skillNames[skillId] ?? skillId;
      showRoll(name, formula);
    });
  });

  // Clicar no pop-up também fecha
  popup.addEventListener('click', hideRoll);

  // ESC fecha o pop-up
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !popup.hasAttribute('hidden')) hideRoll();
  });
}
