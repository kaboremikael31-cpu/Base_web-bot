// server.js — Vendroz-MD Web Server

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import url from "url";
import {
  createSession,
  deleteSession,
  getAllSessions,
  getSessionLogs,
  requestPairingCode,
  getSession,
} from "./sessionManager.js";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
  transports: ["websocket", "polling"],
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// ═══════════════════════════════════════════
//  REST API
// ═══════════════════════════════════════════

// Lister toutes les sessions
app.get("/api/sessions", (req, res) => {
  res.json(getAllSessions());
});

// Créer une nouvelle session
app.post("/api/sessions", async (req, res) => {
  const { userId } = req.body;
  if (!userId || !/^[a-zA-Z0-9_-]{3,30}$/.test(userId)) {
    return res.status(400).json({ error: "userId invalide (3-30 chars, alphanumérique)" });
  }
  const result = await createSession(userId, io);
  res.json(result);
});

// Demander un pairing code
app.post("/api/sessions/:userId/pair", async (req, res) => {
  const { userId } = req.params;
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: "Numéro requis" });
  const result = await requestPairingCode(userId, phone, io);
  res.json(result);
});

// Supprimer une session
app.delete("/api/sessions/:userId", async (req, res) => {
  const { userId } = req.params;
  const result = await deleteSession(userId, io);
  res.json(result);
});

// Logs d'une session
app.get("/api/sessions/:userId/logs", (req, res) => {
  const { userId } = req.params;
  res.json(getSessionLogs(userId));
});

// Stats d'une session
app.get("/api/sessions/:userId/stats", (req, res) => {
  const { userId } = req.params;
  const session = getSession(userId);
  if (!session) return res.status(404).json({ error: "Session introuvable" });
  res.json({ status: session.status, stats: session.stats, phone: session.phone });
});

// ═══════════════════════════════════════════
//  SOCKET.IO
// ═══════════════════════════════════════════

io.on("connection", (socket) => {
  console.log(`🔌 Client connecté: ${socket.id}`);

  // Rejoindre la room d'une session
  socket.on("join_session", (userId) => {
    socket.join(`session:${userId}`);
    console.log(`👁️  ${socket.id} surveille session: ${userId}`);

    // Envoyer l'état actuel immédiatement
    const sessions = getAllSessions();
    if (sessions[userId]) {
      socket.emit("status", { userId, status: sessions[userId].status, phone: sessions[userId].phone });
      socket.emit("stats", { userId, stats: sessions[userId].stats });
    }

    // Envoyer les logs existants
    const logs = getSessionLogs(userId);
    socket.emit("log_history", { userId, logs });
  });

  socket.on("leave_session", (userId) => {
    socket.leave(`session:${userId}`);
  });

  socket.on("disconnect", () => {
    console.log(`🔌 Client déconnecté: ${socket.id}`);
  });
});

// ═══════════════════════════════════════════
//  DÉMARRAGE
// ═══════════════════════════════════════════
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`\n🌌 ═══════════════════════════════════════`);
  console.log(`🚀  VENDROZ-MD WEB SERVER`);
  console.log(`🌐  Dashboard : http://localhost:${PORT}`);
  console.log(`🌌 ═══════════════════════════════════════\n`);
});
