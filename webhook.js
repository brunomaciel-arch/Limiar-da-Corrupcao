/* ══════════════════════════════════════════════════════
   LIMIAR DA CORRUPÇÃO — webhook.js
   Envio de rolagens e status para canais do Discord
   ══════════════════════════════════════════════════════ */

import { getActiveAgent, calcBmMax } from './state.js';

/* ── Helpers ── */
function bar(cur, max, len = 16) {
  if (max <= 0) return '`' + '░'.repeat(len) + '`';
  const filled = Math.round(Math.max(0, Math.min(cur, max)) / max * len);
  return '`' + '█'.repeat(filled) + '░'.repeat(len - filled) + '`';
}

function clampedBar(cur, max, len = 16) {
  // For vida: handles negative values (critical zone)
  if (cur < 0) return '`' + '▓'.repeat(len) + '`  ⚠️';
  return bar(cur, max, len);
}

function scoreLabel(total) {
  if (total >= 26) return '💠 CRÍTICO';
  if (total >= 19) return '✦ ÓTIMO';
  if (total >= 13) return '✔ BOM';
  if (total >= 8)  return '— NEUTRO';
  if (total >= 4)  return '✖ FALHA';
  return '💀 FALHA CRÍTICA';
}

function rolColor(total) {
  if (total >= 26) return 0xffd600;  // gold
  if (total >= 19) return 0x00e5ff;  // cyan
  if (total >= 13) return 0x00e676;  // green
  if (total >= 8)  return 0xb0bec5;  // grey
  if (total >= 4)  return 0xff6d00;  // orange
  return 0xff1744;                    // red
}

async function post(url, payload) {
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    return res.ok;
  } catch (e) {
    console.warn('[Webhook] Falha ao enviar:', e);
    return false;
  }
}

/* ══════════════════════════════════════════════════════
   sendRoll — envia resultado de rolagem
   @param {string} skillName
   @param {number} d1
   @param {number} d2
   @param {number} mod
   @param {number} total
══════════════════════════════════════════════════════ */
export async function sendRoll(skillName, d1, d2, mod, total) {
  const agent = getActiveAgent();
  if (!agent?.webhookRolagens) return;

  const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
  const label  = scoreLabel(total);
  const color  = rolColor(total);

  await post(agent.webhookRolagens, {
    embeds: [{
      color,
      author: {
        name: `${agent.name || '—'}${agent.title ? '  ·  ' + agent.title : ''}`,
      },
      title: `🎲  ${skillName}`,
      fields: [
        { name: 'Dado 1', value: `**${d1}**`,     inline: true },
        { name: 'Dado 2', value: `**${d2}**`,     inline: true },
        { name: 'Mod',    value: `**${modStr}**`, inline: true },
      ],
      footer: { text: `Total: ${total}   ${label}` },
      timestamp: new Date().toISOString(),
    }],
  });
}

/* ══════════════════════════════════════════════════════
   sendStatus — envia estado atual de Vida, BM e Fonte
   @param {string} changedField  — 'vida' | 'bm' | 'fonte'
   @param {number} delta         — diferença (positivo = ganho, negativo = perda)
══════════════════════════════════════════════════════ */
export async function sendStatus(changedField, delta) {
  const agent = getActiveAgent();
  if (!agent?.webhookStatus) return;

  const bmMax      = calcBmMax(agent);
  const fonteTypes = { poder: 'Poder', corrupcao: 'Corrupção', adrenalina: 'Adrenalina' };

  // Delta label
  const sign  = delta > 0 ? '▲' : delta < 0 ? '▼' : '↔';
  const abs   = Math.abs(delta);
  const fieldLabels = { vida: 'Vida', bm: 'Barreira Mágica', fonte: 'Fonte' };
  const deltaStr = delta !== 0
    ? `${fieldLabels[changedField]} alterada  ${sign} ${abs}`
    : `${fieldLabels[changedField]} atualizada`;

  // Embed color based on changed field
  const colors = { vida: 0x00e676, bm: 0x00e5ff, fonte: 0xe040fb };
  const color  = colors[changedField] ?? 0xb0bec5;

  // Build status lines
  const vidaBar   = clampedBar(agent.vidaCur, agent.vidaMax);
  const bmBar     = bar(agent.bmCur, bmMax);
  const fonteBar  = bar(agent.fonteCur, 10);
  const fonteType = fonteTypes[agent.fonteType] || agent.fonteType;

  const vidaStr  = `${vidaBar}  **${agent.vidaCur} / ${agent.vidaMax}**${agent.vidaCur < 0 ? '  zona crítica' : ''}`;
  const bmStr    = `${bmBar}  **${agent.bmCur} / ${bmMax}**`;
  const fonteStr = `${fonteBar}  **${agent.fonteCur} / 10**  ·  ${fonteType}`;

  await post(agent.webhookStatus, {
    embeds: [{
      color,
      author: {
        name: `${agent.name || '—'}${agent.title ? '  ·  ' + agent.title : ''}`,
      },
      title: '📊  Status Vitais',
      fields: [
        { name: '❤️  Vida',            value: vidaStr,  inline: false },
        { name: '🔵  Barreira Mágica', value: bmStr,    inline: false },
        { name: '🟣  Fonte',           value: fonteStr, inline: false },
      ],
      footer: { text: deltaStr },
      timestamp: new Date().toISOString(),
    }],
  });
}

/* ══════════════════════════════════════════════════════
   sendTest — mensagem de teste para validar um webhook
   @param {string} url
   @param {string} type — 'rolagens' | 'status'
   @returns {boolean} sucesso
══════════════════════════════════════════════════════ */
export async function sendTest(url, type) {
  const labels = {
    rolagens: '🎲  Teste de Webhook — Rolagens',
    status:   '📊  Teste de Webhook — Status',
  };
  return post(url, {
    embeds: [{
      color:       0x00e5ff,
      title:       labels[type] ?? '🔧 Teste',
      description: 'Webhook configurado com sucesso! As mensagens do Limiar da Corrupção aparecerão aqui.',
      footer:      { text: 'Limiar da Corrupção' },
      timestamp:   new Date().toISOString(),
    }],
  });
}
