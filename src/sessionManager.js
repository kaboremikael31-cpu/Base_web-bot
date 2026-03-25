// sessionManager.js — Vendroz-MD Web Multi-Session Manager

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import pino from "pino";
import { Boom } from "@hapi/boom";
import fs from "fs";
import path from "path";
import { handleCommand } from "./handler.js";

const sessions = new Map(); // userId → { client, status, stats, logs }

export function getSession(userId) {
  return sessions.get(userId);
}

export function getAllSessions() {
  const result = {};
  for (const [id, s] of sessions.entries()) {
    result[id] = {
      status: s.status,
      stats: s.stats,
      phone: s.phone || null,
    };
  }
  return result;
}

function pushLog(userId, io, msg) {
  const session = sessions.get(userId);
  if (!session) return;
  const entry = { time: new Date().toISOString(), msg };
  session.logs.push(entry);
  if (session.logs.length > 200) session.logs.shift();
  io.to(`session:${userId}`).emit("log", { userId, ...entry });
}

export async function createSession(userId, io) {
  if (sessions.has(userId)) {
    const existing = sessions.get(userId);
    if (existing.status === "connected" || existing.status === "connecting") {
      return { error: "Session already exists" };
    }
    // Restart allowed if disconnected
    sessions.delete(userId);
  }

  const sessionDir = path.resolve(`sessions/${userId}`);
  fs.mkdirSync(sessionDir, { recursive: true });

  const sessionData = {
    status: "connecting",
    client: null,
    phone: null,
    logs: [],
    stats: { messages: 0, uptime: Date.now(), groups: 0, commands: 0 },
    pairingCode: null,
  };
  sessions.set(userId, sessionData);

  io.to(`session:${userId}`).emit("status", { userId, status: "connecting" });
  pushLog(userId, io, "🚀 Initialisation de la session...");

  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    const client = makeWASocket({
      version,
      printQRInTerminal: false,
      browser: ["Ubuntu", "Chrome", "20.0.04"],
      logger: pino({ level: "silent" }),
      auth: state,
    });

    sessionData.client = client;

    // — Pairing code (si pas encore enregistré) —
    if (!client.authState.creds.registered) {
      pushLog(userId, io, "📱 En attente du numéro de téléphone...");
      io.to(`session:${userId}`).emit("status", { userId, status: "awaiting_phone" });
    }

    client.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (connection === "open") {
        sessionData.status = "connected";
        sessionData.phone = client.user?.id?.split(":")[0] || "unknown";

        // Compter les groupes
        try {
          const groups = await client.groupFetchAllParticipating();
          sessionData.stats.groups = Object.keys(groups).length;
        } catch (_) {}

        pushLog(userId, io, `✅ Connecté ! Numéro: ${sessionData.phone}`);
        io.to(`session:${userId}`).emit("status", { userId, status: "connected", phone: sessionData.phone });
        io.to(`session:${userId}`).emit("stats", { userId, stats: sessionData.stats });

        // Suivre newsletters depuis config
        try {
          const { default: config } = await import("./config.js");
          const newsletters = [
            config.Newsletter, config.Newsletter2, config.Newsletter3,
            config.Newsletter4, config.Newsletter5, config.Newsletter6,
          ].filter(n => n && n.includes("@newsletter"));
          for (const jid of newsletters) {
            await client.subscribeToNewsletter(jid).catch(() => {});
          }
        } catch (_) {}

      } else if (connection === "close") {
        const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
        sessionData.status = "disconnected";

        if (reason === DisconnectReason.loggedOut) {
          pushLog(userId, io, "❌ Session expirée (loggedOut). Reconnectez-vous.");
          io.to(`session:${userId}`).emit("status", { userId, status: "logged_out" });
          sessions.delete(userId);
          fs.rmSync(sessionDir, { recursive: true, force: true });
        } else {
          pushLog(userId, io, `⚠️ Déconnecté (code: ${reason}). Redémarrage...`);
          io.to(`session:${userId}`).emit("status", { userId, status: "reconnecting" });
          setTimeout(() => createSession(userId, io), 3000);
        }
      }
    });

    client.ev.on("messages.upsert", async (chatUpdate) => {
      const msg = chatUpdate.messages[0];
      if (!msg.message) return;
      if (msg.key.remoteJid === "status@broadcast") return;

      sessionData.stats.messages++;
      io.to(`session:${userId}`).emit("stats", { userId, stats: sessionData.stats });

      const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
      if (text.startsWith(".")) {
        sessionData.stats.commands++;
        pushLog(userId, io, `📨 Commande reçue: ${text.split(" ")[0]} depuis ${msg.key.remoteJid}`);
      }

      await handleCommand(msg, client);
    });

    client.ev.on("creds.update", saveCreds);

    return { success: true, userId };

  } catch (err) {
    pushLog(userId, io, `❌ Erreur création session: ${err.message}`);
    sessionData.status = "error";
    io.to(`session:${userId}`).emit("status", { userId, status: "error", error: err.message });
    return { error: err.message };
  }
}

export async function requestPairingCode(userId, phone, io) {
  const session = sessions.get(userId);
  if (!session || !session.client) return { error: "Session not found" };

  try {
    const clean = phone.replace(/[^0-9]/g, "");
    const code = await session.client.requestPairingCode(clean);
    session.pairingCode = code;
    session.phone = clean;
    pushLog(userId, io, `🔑 Code de pairage généré pour ${clean}: ${code}`);
    io.to(`session:${userId}`).emit("pairing_code", { userId, code, phone: clean });
    return { success: true, code };
  } catch (err) {
    pushLog(userId, io, `❌ Erreur pairing code: ${err.message}`);
    return { error: err.message };
  }
}

export async function deleteSession(userId, io) {
  const session = sessions.get(userId);
  if (session?.client) {
    try { await session.client.logout(); } catch (_) {}
    try { session.client.end(); } catch (_) {}
  }
  sessions.delete(userId);
  const sessionDir = path.resolve(`sessions/${userId}`);
  fs.rmSync(sessionDir, { recursive: true, force: true });
  io.to(`session:${userId}`).emit("status", { userId, status: "deleted" });
  return { success: true };
}

export function getSessionLogs(userId) {
  return sessions.get(userId)?.logs || [];
}
