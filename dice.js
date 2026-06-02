/* ══════════════════════════════════════════════════════
   LIMIAR DA CORRUPÇÃO — dice.js  (v5)
   Rolagem 2d10 com bônus, dado livre, labels de qualidade
   ══════════════════════════════════════════════════════ */

import { getActiveAgent, calcSkillMod, pushRollHistory } from './state.js';
import { populateRollHistory } from './ui.js';
import { sendRoll } from './webhook.js';

/* ── DOM refs ── */
const elSkill   = document.getElementById('roll-result-skill');
const elD1      = document.getElementById('roll-d1');
const elD2      = document.getElementById('roll-d2');
const elMod     = document.getElementById('roll-mod');
const elTotal   = document.getElementById('roll-total');
const elQuality = document.getElementById('roll-quality');
const elDice    = document.getElementById('roll-result-dice');

let _rolling = false;

/* ══════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════ */
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Determina a qualidade da rolagem.
 * Prioridade: Axioma > Absurdo > Fluidez/Atrito
 */
function qualityLabel(d1, d2, total) {
  if (d1 === 10 && d2 === 10) return { label: '✦ Axioma',  cls: 'axioma'  };
  if (d1 === 1  && d2 === 1 ) return { label: '✖ Absurdo', cls: 'absurdo' };
  if (total % 2 === 0)         return { label: '~ Fluidez', cls: 'fluidez' };
  return                              { label: '~ Atrito',  cls: 'atrito'  };
}

function getBonusValue() {
  return parseInt(document.getElementById('roll-bonus-input')?.value ?? '0', 10) || 0;
}

/* ══════════════════════════════════════════════════════
   MOSTRAR RESULTADO NO PAINEL
══════════════════════════════════════════════════════ */
function showResult(skillLabel, diceHtml, modStr, total, d1, d2, bonus) {
  elSkill.textContent = skillLabel.toUpperCase();
  elDice.innerHTML    = diceHtml;
  elMod.textContent   = modStr;
  elTotal.textContent = total;
  elTotal.style.color = totalColor(total);

  const q = qualityLabel(d1, d2, total);
  elQuality.textContent = q.label;
  elQuality.className   = `roll-result__quality ${q.cls}`;
}

function totalColor(t) {
  if (t <= 4)  return 'var(--red)';
  if (t <= 10) return 'var(--text-mid)';
  if (t <= 18) return 'var(--text-bright)';
  if (t <= 25) return 'var(--cyan)';
  return 'var(--gold)';
}

/* ══════════════════════════════════════════════════════
   ROLAGEM DE PERÍCIA (2d10 + mod + bônus)
══════════════════════════════════════════════════════ */
export function rollSkill(skillName, formula) {
  if (_rolling) return;
  _rolling = true;

  const agent  = getActiveAgent();
  const mod    = agent ? calcSkillMod(agent, formula) : 0;
  const bonus  = getBonusValue();
  const modStr = buildModStr(mod, bonus);

  elSkill.textContent   = skillName.toUpperCase();
  elQuality.textContent = '';
  elQuality.className   = 'roll-result__quality';
  elTotal.style.color   = '';

  // Animation
  const FRAMES = 10, MS = 55;
  let f = 0;
  const ticker = setInterval(() => {
    elD1.textContent = rand(1, 10);
    elD2.textContent = rand(1, 10);
    elTotal.textContent = '?';
    f++;
    if (f >= FRAMES) {
      clearInterval(ticker);
      const d1    = rand(1, 10);
      const d2    = rand(1, 10);
      const total = d1 + d2 + mod + bonus;

      // Build dice HTML (standard 2d10 view)
      const diceHtml = `
        <span class="roll-die">${d1}</span>
        <span class="roll-sep">+</span>
        <span class="roll-die">${d2}</span>
        <span class="roll-sep">+</span>
        <span class="roll-mod">${modStr}</span>`;

      showResult(skillName, diceHtml, modStr, total, d1, d2, bonus);

      // History
      const entry = { skill: skillName, d1, d2, mod, bonus, total, ts: Date.now() };
      pushRollHistory(entry);
      populateRollHistory(getActiveAgent());

      // Webhook
      sendRoll(skillName, d1, d2, mod, bonus, total);

      _rolling = false;
    }
  }, MS);
}

/** Builds the modifier display string including bonus if non-zero */
function buildModStr(mod, bonus) {
  if (bonus === 0) return mod >= 0 ? `+${mod}` : `${mod}`;
  const modPart   = mod   >= 0 ? `+${mod}`   : `${mod}`;
  const bonusPart = bonus >= 0 ? `+${bonus}` : `${bonus}`;
  return `${modPart} ${bonusPart}`;
}

/* ══════════════════════════════════════════════════════
   DADO LIVRE — parser de expressão (ex: 4d6+2+5)
══════════════════════════════════════════════════════ */

/**
 * Parseia expressões como "4d6+2+5", "3d8-1", "1d100", "2d10+3+2"
 * Suporta múltiplos termos separados por + ou -
 * Retorna { dice: [{count,sides}], bonus: number } ou null se inválido
 */
function parseExpression(expr) {
  const cleaned = expr.replace(/\s/g, '').toLowerCase();
  if (!cleaned) return null;

  // Split by + and - keeping the sign
  const tokens = cleaned.match(/[+-]?[^+-]+/g);
  if (!tokens) return null;

  const dice  = [];
  let   bonus = 0;

  for (const token of tokens) {
    const diceMatch = token.match(/^([+-]?)(\d+)d(\d+)$/);
    if (diceMatch) {
      const sign  = diceMatch[1] === '-' ? -1 : 1;
      const count = parseInt(diceMatch[2], 10);
      const sides = parseInt(diceMatch[3], 10);
      if (count < 1 || count > 100 || sides < 2 || sides > 1000) return null;
      dice.push({ count, sides, sign });
    } else {
      const numMatch = token.match(/^([+-]?\d+)$/);
      if (!numMatch) return null;
      bonus += parseInt(numMatch[1], 10);
    }
  }

  if (dice.length === 0) return null;
  return { dice, bonus };
}

export function rollFree(expr) {
  if (_rolling) return { ok: false, error: 'Aguarde a rolagem anterior.' };

  const parsed = parseExpression(expr);
  if (!parsed) {
    return { ok: false, error: 'Formato inválido. Ex: 4d6+2  /  3d8+1' };
  }

  _rolling = true;

  // Roll all dice
  const results = [];
  let   total   = 0;

  for (const { count, sides, sign } of parsed.dice) {
    for (let i = 0; i < count; i++) {
      const r = rand(1, sides);
      results.push({ value: r, sign, sides });
      total += r * sign;
    }
  }
  total += parsed.bonus;

  // Build label — first dice group label
  const firstGroup = parsed.dice[0];
  const diceLabel  = parsed.dice.map(d =>
    `${d.sign < 0 ? '-' : ''}${d.count}d${d.sides}`
  ).join('+') + (parsed.bonus !== 0 ? (parsed.bonus > 0 ? `+${parsed.bonus}` : parsed.bonus) : '');

  // Build dice HTML — show up to 8 dice, then summarise
  let diceHtml = '';
  const display = results.slice(0, 8);
  display.forEach((r, i) => {
    if (i > 0) diceHtml += '<span class="roll-sep">+</span>';
    diceHtml += `<span class="roll-die roll-die--free">${r.value}</span>`;
  });
  if (results.length > 8) {
    diceHtml += `<span class="roll-sep">···</span>`;
  }
  if (parsed.bonus !== 0) {
    const b = parsed.bonus;
    diceHtml += `<span class="roll-sep">+</span><span class="roll-mod">${b > 0 ? '+'+b : b}</span>`;
  }

  // Use d1/d2 as first two dice for quality (or same value if only one die)
  const d1 = results[0]?.value ?? 1;
  const d2 = results[1]?.value ?? results[0]?.value ?? 1;

  showResult(diceLabel, diceHtml, '', total, d1, d2, 0);

  // History entry
  const entry = {
    skill: diceLabel,
    free:  true,
    total,
    ts:    Date.now(),
  };
  pushRollHistory(entry);
  populateRollHistory(getActiveAgent());

  // Webhook — free roll
  const agent = getActiveAgent();
  if (agent?.webhookRolagens) {
    sendRoll(diceLabel, d1, d2, 0, parsed.bonus, total, true);
  }

  _rolling = false;
  return { ok: true };
}

/* ══════════════════════════════════════════════════════
   BINDINGS
══════════════════════════════════════════════════════ */
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
  // Perícias
  document.querySelectorAll('.skill-row[data-skill]').forEach(row => {
    row.addEventListener('click', () => {
      rollSkill(SKILL_NAMES[row.dataset.skill] ?? row.dataset.skill, row.dataset.formula);
    });
  });

  // Bônus +/−
  const bonusInput = document.getElementById('roll-bonus-input');
  document.getElementById('roll-bonus-inc')?.addEventListener('click', () => {
    bonusInput.value = (parseInt(bonusInput.value || '0', 10) + 1).toString();
  });
  document.getElementById('roll-bonus-dec')?.addEventListener('click', () => {
    bonusInput.value = (parseInt(bonusInput.value || '0', 10) - 1).toString();
  });

  // Dado livre
  const freeInput = document.getElementById('roll-free-input');
  const freeError = document.getElementById('roll-free-error');
  const freeBtn   = document.getElementById('roll-free-btn');

  function triggerFree() {
    const expr = freeInput.value.trim();
    if (!expr) return;
    const result = rollFree(expr);
    if (!result.ok) {
      freeError.textContent = result.error;
      setTimeout(() => { freeError.textContent = ''; }, 3000);
    } else {
      freeError.textContent = '';
    }
  }

  freeBtn?.addEventListener('click', triggerFree);
  freeInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter') triggerFree();
  });
}
