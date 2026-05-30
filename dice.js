/* ══════════════════════════════════════════════════════
   LIMIAR DA CORRUPÇÃO — dice.js  (v2)
   Rolagem 2d10 → painel inline + histórico persistido
   ══════════════════════════════════════════════════════ */

import { getActiveAgent, calcSkillMod, pushRollHistory } from './state.js';
import { populateRollHistory } from './ui.js';

const elSkill = document.getElementById('roll-result-skill');
const elD1    = document.getElementById('roll-d1');
const elD2    = document.getElementById('roll-d2');
const elMod   = document.getElementById('roll-mod');
const elTotal = document.getElementById('roll-total');

let _rolling = false;

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

export function rollSkill(skillName, formula) {
  if (_rolling) return;
  _rolling = true;

  const agent = getActiveAgent();
  const mod   = agent ? calcSkillMod(agent, formula) : 0;

  elSkill.textContent = skillName.toUpperCase();
  elMod.textContent   = mod >= 0 ? `+${mod}` : `${mod}`;
  elTotal.textContent = '?';
  elTotal.style.color = '';

  // Animate dice
  const FRAMES = 10, MS = 55;
  let f = 0;
  const ticker = setInterval(() => {
    elD1.textContent = rand(1,10);
    elD2.textContent = rand(1,10);
    f++;
    if (f >= FRAMES) {
      clearInterval(ticker);
      const d1 = rand(1,10), d2 = rand(1,10);
      const total = d1 + d2 + mod;
      elD1.textContent    = d1;
      elD2.textContent    = d2;
      elTotal.textContent = total;
      elTotal.style.color = totalColor(total);

      // Persist to history
      const entry = { skill: skillName, d1, d2, mod, total, ts: Date.now() };
      pushRollHistory(entry);
      populateRollHistory(getActiveAgent());

      _rolling = false;
    }
  }, MS);
}

function totalColor(t) {
  if (t <= 5)  return 'var(--red)';
  if (t <= 11) return 'var(--text-mid)';
  if (t <= 18) return 'var(--text-bright)';
  if (t <= 25) return 'var(--cyan)';
  return 'var(--gold)';
}

const SKILL_NAMES = {
  'atletismo':'Atletismo','forca':'Força','resistencia-fisica':'Resistência Física',
  'sobrevivencia':'Sobrevivência','intuicao':'Intuição','percepcao':'Percepção',
  'tecnologia':'Tecnologia','raciocinio':'Raciocínio','prestidigitacao':'Prestidigitação',
  'furtividade':'Furtividade','engano':'Engano','presenca-skill':'Presença',
  'redirecionamento':'Redirecionamento','medicina':'Medicina','confeccao':'Confecção e Reparo',
  'resistencia-mental':'Resistência Mental','concentracao':'Concentração',
  'agilidade':'Agilidade','investigacao':'Investigação','negociacao':'Negociação',
};

export function bindSkillRolls() {
  document.querySelectorAll('.skill-row[data-skill]').forEach(row => {
    row.addEventListener('click', () => {
      rollSkill(SKILL_NAMES[row.dataset.skill] ?? row.dataset.skill, row.dataset.formula);
    });
  });
}
