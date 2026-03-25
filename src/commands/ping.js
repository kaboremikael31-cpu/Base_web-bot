export default async function pingCommand(message, client) {
  const start = Date.now();
  await client.sendPresenceUpdate('composing', message.key.remoteJid);
  const latency = Date.now() - start;
  await client.sendMessage(message.key.remoteJid, { text: `⚡ *Cyber Ping*\nLatence : ${latency}ms\nStatus : *Quantum Fast* 🌌` }, { quoted: message });
}
