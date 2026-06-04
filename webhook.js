/* ══════════════════════════════════════════════════════
   LIMIAR DA CORRUPÇÃO — webhook.js  (v5 completo)
   ══════════════════════════════════════════════════════ */

import { getActiveAgent, calcBmMax } from './state.js';

function bar(cur, max, len = 16) {
  if (max <= 0) return '`' + '░'.repeat(len) + '`';
  const filled = Math.round(Math.max(0, Math.min(cur, max)) / max * len);
  return '`' + '█'.repeat(filled) + '░'.repeat(len - filled) + '`';
}
function clampedBar(cur, max, len = 16) {
  if (cur < 0) return '`' + '▓'.repeat(len) + '`';
  return bar(cur, max, len);
}

function qualityLabel(d1, d2, total) {
  if (d1 === 10 && d2 === 10) return '✦ Axioma';
  if (d1 === 1  && d2 === 1)  return '✖ Absurdo';
  if (total % 2 === 0)        return '~ Fluidez';
  return '~ Atrito';
}

function rollColor(label) {
  if (label.includes('Axioma'))  return 0xffd600;
  if (label.includes('Fluidez')) return 0x00e5ff;
  if (label.includes('Atrito'))  return 0xe040fb;
  if (label.includes('Absurdo')) return 0xff1744;
  return 0xb0bec5;
}

async function post(url, payload) {
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (e) {
    console.warn('[Webhook] Falha:', e);
    return false;
  }
}

/* ══ sendRoll ══ */
export async function sendRoll(skillName, d1, d2, mod, bonus, total, isFree = false, allDice = null) {
  const agent = getActiveAgent();
  if (!agent?.webhookRolagens) return;

  const label  = qualityLabel(d1, d2, total);
  const color  = rollColor(label);
  const fields = [];

  if (!isFree) {
    // Perícia: d1, d2, mod e bônus separados
    const modStr   = mod   >= 0 ? `+${mod}`   : `${mod}`;
    const bonusStr = bonus >= 0 ? `+${bonus}`  : `${bonus}`;
    fields.push({ name: 'Dado 1', value: `**${d1}**`, inline: true });
    fields.push({ name: 'Dado 2', value: `**${d2}**`, inline: true });
    if (bonus !== 0) {
      fields.push({ name: 'Mod',   value: `**${modStr}**`,   inline: true });
      fields.push({ name: 'Bônus', value: `**${bonusStr}**`, inline: true });
    } else {
      fields.push({ name: 'Mod', value: `**${modStr}**`, inline: true });
    }
  } else {
    // Dado livre: mostrar cada dado individualmente
    if (allDice && allDice.length > 0) {
      // Agrupar por sides para exibição
      const groups = {};
      allDice.forEach(({ value, sign, sides }) => {
        const key = `${sign < 0 ? '-' : ''}d${sides}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(value);
      });

      Object.entries(groups).forEach(([groupName, values]) => {
        const vals = values.map(v => `**${v}**`).join('  ·  ');
        fields.push({ name: groupName, value: vals, inline: false });
      });
    } else {
      fields.push({ name: 'Expressão', value: `\`${skillName}\``, inline: true });
    }

    if (bonus !== 0) {
      const b = bonus >= 0 ? `+${bonus}` : `${bonus}`;
      fields.push({ name: 'Bônus fixo', value: `**${b}**`, inline: true });
    }
  }

  await post(agent.webhookRolagens, {
    embeds: [{
      color,
      author: { name: `${agent.name || '—'}${agent.title ? '  ·  ' + agent.title : ''}` },
      title: `🎲  ${skillName}`,
      fields,
      footer: { text: `Total: ${total}   ${label}` },
      timestamp: new Date().toISOString(),
    }],
  });
}

/* ══ sendStatus com debounce de 5s ══ */
let _statusTimer = null;
const _pending   = { vida: 0, bm: 0, fonte: 0 };

export function sendStatus(field, delta) {
  _pending[field] = (_pending[field] || 0) + delta;
  if (_statusTimer) clearTimeout(_statusTimer);
  _statusTimer = setTimeout(flushStatus, 5000);
}

async function flushStatus() {
  _statusTimer = null;
  const agent = getActiveAgent();
  if (!agent?.webhookStatus) { _pending.vida = _pending.bm = _pending.fonte = 0; return; }

  const bmMax      = calcBmMax(agent);
  const fonteTypes = { poder: 'Poder', corrupcao: 'Corrupção', adrenalina: 'Adrenalina' };

  const vidaStr  = `${clampedBar(agent.vidaCur, agent.vidaMax)}  **${agent.vidaCur} / ${agent.vidaMax}**${agent.vidaCur < 0 ? '  ⚠️ zona crítica' : ''}`;
  const bmStr    = `${bar(agent.bmCur, bmMax)}  **${agent.bmCur} / ${bmMax}**`;
  const fonteStr = `${bar(agent.fonteCur, 10)}  **${agent.fonteCur} / 10**  ·  ${fonteTypes[agent.fonteType] || agent.fonteType}`;

  const changes = [];
  if (_pending.vida  !== 0) changes.push(`Vida ${_pending.vida > 0 ? '▲' : '▼'} ${Math.abs(_pending.vida)}`);
  if (_pending.bm    !== 0) changes.push(`Barreira ${_pending.bm > 0 ? '▲' : '▼'} ${Math.abs(_pending.bm)}`);
  if (_pending.fonte !== 0) changes.push(`Fonte ${_pending.fonte > 0 ? '▲' : '▼'} ${Math.abs(_pending.fonte)}`);

  const maxField = Object.entries(_pending).sort((a,b) => Math.abs(b[1]) - Math.abs(a[1]))[0][0];
  const colors   = { vida: 0x00e676, bm: 0x00e5ff, fonte: 0xe040fb };

  _pending.vida = _pending.bm = _pending.fonte = 0;

  await post(agent.webhookStatus, {
    embeds: [{
      color: colors[maxField] ?? 0xb0bec5,
      author: { name: `${agent.name || '—'}${agent.title ? '  ·  ' + agent.title : ''}` },
      title: '📊  Status Vitais',
      fields: [
        { name: '❤️  Vida',            value: vidaStr,  inline: false },
        { name: '🔵  Barreira Mágica', value: bmStr,    inline: false },
        { name: '🟣  Fonte',           value: fonteStr, inline: false },
      ],
      footer: { text: changes.length > 0 ? `Alterações: ${changes.join('  ·  ')}` : 'Status atualizado' },
      timestamp: new Date().toISOString(),
    }],
  });
}

/* ══ sendTest ══ */
export async function sendTest(url, type) {
  return post(url, {
    embeds: [{
      color: 0x00e5ff,
      title: type === 'rolagens' ? '🎲  Teste — Rolagens' : '📊  Teste — Status',
      description: 'Webhook configurado com sucesso!',
      footer: { text: 'Limiar da Corrupção' },
      timestamp: new Date().toISOString(),
    }],
  });
}
