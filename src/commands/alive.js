export default async function aliveCommand(message, client, { config }) {
  const aliveText = `
╭──────━ • ≪ 🌌 VENDROZ-MD ≫ • ━──────╮
┃            *EN LIGNE*             ┃
┃       Cyber Mode Activé ∞         ┃
╰──────━ • ≪ 🔥 2025 ≫ • ━──────╯

👑 Créateur : ${config.nameCreator}
🚀 Version : 1.0 Cyber Edition
📊 Status : Online 24/7
⚡ Préfixe : .

Rejoignez le channel Vendroz-Tech :
${config.Newsletter6}

Le bot du futur est prêt ! 🌌
  `;

  await client.sendMessage(message.key.remoteJid, {
    image: { url: "./assets/thumb.jpg" },
    caption: aliveText,
    contextInfo: {
      externalAdReply: {
        title: "Vendroz-MD • Alive & Ready",
        body: "Powered by Vendroz-Tech",
        thumbnailUrl: "https://files.catbox.moe/v4z1qg.jpg",
        sourceUrl: config.Newsletter6,
        mediaType: 1,
        renderLargerThumbnail: true
      }
    }
  });
  }
