// handler.js - Vendroz-MD Cyber Edition

import fs from "fs";
import path from "path";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

// --- Chargement DB groupe (antilink, welcome, etc.) ---
let db = {};
const dbPath = path.join(__dirname, "db.json");
if (fs.existsSync(dbPath)) {
  db = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
}

// --- Chargement dynamique des commandes ---
const commands = new Map();
const commandsPath = path.join(__dirname, "commands");

if (fs.existsSync(commandsPath)) {
  const files = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));
  for (const file of files) {
    const commandName = file.replace(".js", "").toLowerCase();
    try {
      const module = await import(`./commands/${file}`);
      commands.set(commandName, module.default || module[`${commandName}Command`]);
      console.log(`✅ Commande chargée : .${commandName}`);
    } catch (err) {
      console.error(`❌ Erreur chargement ${file} :`, err);
    }
  }
}

// --- Fonction react auto (si react.js existe) ---
let react = null;
try {
  const reactModule = await import("./commands/react.js");
  react = reactModule.default || reactModule.reactCommand;
} catch (err) {
  // Pas de react.js = pas de réaction auto
}

// --- Récupérer numéro sender ---
function getSenderNumber(message) {
  let senderJid = message.key.fromMe ? message.key.remoteJid : message.key.participant || message.key.remoteJid;
  return senderJid.replace(/[^0-9]/g, "");
}

// --- Récupérer target (mention/reply/args) ---
function getTargetUser(message) {
  const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const args = (message.message?.conversation || message.message?.extendedTextMessage?.text || "").split(" ");

  if (quoted) return message.message.extendedTextMessage.contextInfo.participant?.replace(/[^0-9]/g, "");
  if (mentioned.length > 0) return mentioned[0].replace(/[^0-9]/g, "");
  if (args[1]) return args[1].replace(/[^0-9]/g, "");
  return null;
}

// --- Log messages ---
function logMessage(message, type = "IN") {
  const remoteJid = message.key.remoteJid;
  const senderName = message.pushName || "Unknown";
  const sender = getSenderNumber(message);
  const text = message.message?.conversation || message.message?.extendedTextMessage?.text || "(media)";

  console.log(`[\( {type}] \){remoteJid.includes("@g.us") ? "GROUPE" : "DM"} | \( {senderName} ( \){sender}) → ${text}`);
}

// --- Autorespond tag bot avec sticker ---
async function autoTagRespond(message, client) {
  const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  const botJid = client.user.id.split(":")[0] + "@s.whatsapp.net";

  if (mentioned.includes(botJid)) {
    try {
      await client.sendMessage(message.key.remoteJid, { sticker: fs.readFileSync("./assets/tag.webp") });
    } catch (err) {
      console.log("Sticker tag.webp pas trouvé");
    }
  }
}

// --- Anti-link auto (3 warnings → kick) ---
async function antiLinkCheck(message, client) {
  const groupId = message.key.remoteJid;
  if (!groupId.endsWith("@g.us") || !db[groupId]?.antilink) return false;

  const text = message.message?.conversation || message.message?.extendedTextMessage?.text || "";
  const hasLink = /http|www\.|\.com|t\.me|wa\.me|chat\.whatsapp/i.test(text);

  if (hasLink && !message.key.fromMe) {
    const sender = getSenderNumber(message) + "@s.whatsapp.net";
    db[groupId].warnings = db[groupId].warnings || {};

    db[groupId].warnings[sender] = (db[groupId].warnings[sender] || 0) + 1;

    if (db[groupId].warnings[sender] >= 3) {
      await client.groupParticipantsUpdate(groupId, [sender], "remove");
      await client.sendMessage(groupId, { text: `🚫 @${sender.split("@")[0]} expulsé pour liens répétés (3 warnings)` , mentions: [sender] });
      delete db[groupId].warnings[sender];
    } else {
      await client.sendMessage(groupId, { text: `⚠️ @\( {sender.split("@")[0]} Lien interdit ! Warning \){db[groupId].warnings[sender]}/3`, mentions: [sender] });
      await client.sendMessage(groupId, { delete: message.key });
    }

    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    return true;
  }
  return false;
}

// --- Handler principal ---
export async function handleCommand(message, client) {
  try {
    logMessage(message, "IN");

    // Autorespond tag bot
    await autoTagRespond(message, client);

    // Anti-link check
    if (await antiLinkCheck(message, client)) return;

    const text = message.message?.conversation || message.message?.extendedTextMessage?.text || "";
    const prefix = ".";

    if (!text.startsWith(prefix)) return;

    const args = text.slice(prefix.length).trim().split(/ +/);
    const command = args.shift()?.toLowerCase();

    if (!commands.has(command)) return;

    const sender = getSenderNumber(message);
    const target = getTargetUser(message);
    const isOwner = sender === "22606527293"; // TON numéro sans + (remplace par le tien)
    const isCreator = sender === "22606527293"; // Même ou autre

    // Réaction auto si react.js existe
    if (react) {
      try {
        await react(message, client);
      } catch (err) {}
    }

    const cmd = commands.get(command);

    await cmd(message, client, {
      sender,
      target,
      args,
      isOwner,
      isCreator,
      config: (await import("./config.js")).default,
      db,
      updateDb: () => fs.writeFileSync(dbPath, JSON.stringify(db, null, 2))
    });

    logMessage({ ...message, message: { conversation: `Commande .${command} exécutée` } }, "OUT");

  } catch (err) {
    console.error("Erreur handler :", err);
    await client.sendMessage(message.key.remoteJid, { text: "🔴 Erreur interne bro 😔" });
  }
}
