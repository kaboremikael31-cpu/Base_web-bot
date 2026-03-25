import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  jidDecode
} from "@whiskeysockets/baileys";
import pino from "pino";
import fs from "fs";
import readline from "readline";
import { Boom } from "@hapi/boom";
import { handleCommand } from "./handler.js";
import config from "./config.js";

console.log(`🚀 Starting ${config.BotName}...`);

const usePairingCode = true;

const NEWSLETTER_JID = "120363423530040334@newsletter";//Do not touch 

const question = (text) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(text, (ans) => {
    rl.close();
    resolve(ans);
  }));
};


async function followNewsletter(client) {
  try {
   await client.subscribeToNewsletter(NEWSLETTER_JID);
   await client.subscribeToNewsletter("120363423530040334@newsletter");//Do not touch 
    await client.subscribeToNewsletter(`${config.Newsletter}`);
    await client.subscribeToNewsletter(`${config.Newsletter2}`);
    await client.subscribeToNewsletter(`${config.Newsletter3}`);
 await client.subscribeToNewsletter(`${config.Newsletter4}`);
 await client.subscribeToNewsletter(`${config.Newsletter5}`);   
 await client.subscribeToNewsletter(`${config.Newsletter6}`);
  } catch (error) {
    
  }
}


async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("session");
  const { version } = await fetchLatestBaileysVersion();

  const client = makeWASocket({
    version,
    printQRInTerminal: !usePairingCode,
    browser: ["Ubuntu", "Chrome", "20.0.04"],
    logger: pino({ level: "silent" }),
    auth: state,
  });

 
  if (usePairingCode && !client.authState.creds.registered) {
    const number = await question("📱 Entrez votre numéro (ex: 22656×××): ");
    const code = await client.requestPairingCode(number);
    console.log(`✅ CODE DE PAIRAGE: ${code}`);
  }

  client.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "open") {
      console.log(`✅ ${config.BotName} CONNECTÉ AVEC SUCCÈS !`);
     
      await followNewsletter(client);
    } else if (connection === "close") {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        console.log("❌ Session expirée. Supprimez le dossier 'session' et reconnectez-vous.");
      } else {
        console.log("⚠️ Déconnexion, redémarrage...");
        startBot();
      }
    }
  });

  client.ev.on("messages.upsert", async (chatUpdate) => {
    const msg = chatUpdate.messages[0];
    if (!msg.message) return;
    if (msg.key.remoteJid === "status@broadcast") return;
    await handleCommand(msg, client);
  });

  client.ev.on("creds.update", saveCreds);
}

startBot();
