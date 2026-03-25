// commands/menu.js - Vendroz-MD Ultra Cyber Neon Menu v2.0

export default async function menuCommand(message, client, { config }) {
  const cyberMenu = `
┏━━━ *VENDROZ-MD* ━━━┓
┃    *CYBER  EDITION*    ┃
┗━━━ *2025 VT BOT* ━━━┛

╭━━━ ≪ 👾 INFO CORE ≫ ━━━╮
│ 👑 Créateur : *𝐕𝐄𝐍𝐓𝐑𝐎𝐙*
│ 🍷 Préfixe : .
│ 🌐 Mode : Public
│ ↗️ Status : Online Quantum
│ 🦠 Commandes : +50
╰━━━━━━━━━━━━━━━━━━━━━╯

╭━━━ ≪ 💻 MENU FUN ≫ ━━━╮
│ .chat → Vendroz AI 
│ .sticker → Image/Vidéo
│ .alive → Check bot alive stylé
│ .tiktok → Lien TikTok DL HD
│ .img → Recherche images
│ .owner → Contact Vendroz
│ .song → Musique DL 
│ .yt → YouTube Vidéo DL
│ .compliment → Compliment
│ .insulte → Insulte blague 
│ .tagall → Tag tout le groupe
│ .love → Love calculator 
╰━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━ ≪ 👑 ADMIN TOOLS ≫ ━━━╮
│ .antilink → on/off (anti-liens)
│ .anti → <type> on/off
│ .kick → @user (virer)
│ .kickall → Virer tous 
│ .promote → @user 
│ .promoteall → Tous admins
│ .demote → @user 
│ .demoteall → Rétrograde All
│ .welcome → on/off 
│ .goodbye → on/off 
│ .mode → private/public
│ .setprefix → <prefixe> 
│ .url → Répond media → Catbox
│ .vv → Révéler viewonce
│ .vidio → Vidéo → Audio
│ .audeo → Audio → Vidéo
│ .pair → <num> 
│ .botinfo → Info bot 
│ .zipbot → Download ZIP bot
╰━━━━━━━━━━━━━━━━━━━━━━━╯

🦠 *Vendroz-Tech Channel* : ${config.Newsletter6}
© 2025-𝚃𝙷𝙸𝚂 𝙿𝚁𝙾𝙹𝙴𝚃 𝙸𝚃'𝙸𝚂 𝙿𝚄𝙱𝙻𝙸𝙲
  `;

  await client.sendMessage(message.key.remoteJid, {
    image: { url: "./assets/thumb.jpg" },
    caption: cyberMenu,
    templateButtons: [
      {
        index: 1,
        urlButton: {
          displayText: "VIEW CHANNEL 👀",
          url: config.Newsletter6
        }
      },
      {
        index: 2,
        quickReplyButton: {
          displayText: "DOWNLOAD ZIP 📥",
          id: ".zipbot" // Appelle la commande .zipbot pour envoyer le zip
        }
      }
    ],
    contextInfo: {
      externalAdReply: {
        title: "Vendroz-MD • Ultra Neon Edition",
        body: "Le bot qui éclate tout 🔥🌌",
        thumbnailUrl: "https://files.catbox.moe/v4z1qg.jpg",
        sourceUrl: config.Newsletter6,
        mediaType: 1,
        renderLargerThumbnail: true
      }
    }
  }, { quoted: message });

  await client.sendMessage(message.key.remoteJid, { react: { text: "🌌", key: message.key } });
}
