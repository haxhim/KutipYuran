import fs from "fs";
import path from "path";
import qrcode from "qrcode";
import { Client, LocalAuth } from "whatsapp-web.js";
import { WhatsAppSessionStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { generateReference } from "@/lib/ids";
import { toWhatsappJid } from "@/lib/phone";

const clients = new Map<string, Client>();

function ensureSessionDir() {
  fs.mkdirSync(env.WHATSAPP_SESSION_ROOT, { recursive: true });
}

export async function createWhatsappSession(organizationId: string, label: string) {
  const session = await db.whatsAppSession.create({
    data: {
      organizationId,
      label,
      sessionKey: generateReference("wa").toLowerCase(),
      status: WhatsAppSessionStatus.PENDING_QR,
    },
  });

  try {
    await getOrCreateWhatsappClient(session.sessionKey, session.id, organizationId);
  } catch (error) {
    await db.whatsAppSession.update({
      where: { id: session.id },
      data: {
        status: WhatsAppSessionStatus.FAILED,
      },
    });
    throw error;
  }

  return session;
}

export async function getOrCreateWhatsappClient(sessionKey: string, sessionId: string, organizationId: string) {
  ensureSessionDir();

  if (clients.has(sessionKey)) {
    return clients.get(sessionKey)!;
  }

  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: sessionKey,
      dataPath: env.WHATSAPP_SESSION_ROOT,
    }),
    puppeteer: {
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  });

  client.on("qr", async (qr) => {
    const qrCodeDataUrl = await qrcode.toDataURL(qr);
    await db.whatsAppSession.update({
      where: { id: sessionId },
      data: {
        status: WhatsAppSessionStatus.PENDING_QR,
        qrCodeDataUrl,
      },
    });
  });

  client.on("ready", async () => {
    await db.whatsAppSession.update({
      where: { id: sessionId },
      data: {
        status: WhatsAppSessionStatus.CONNECTED,
        lastActiveAt: new Date(),
      },
    });
  });

  client.on("authenticated", async () => {
    await db.whatsAppConnectionLog.create({
      data: {
        organizationId,
        whatsappSessionId: sessionId,
        eventType: "authenticated",
        message: "WhatsApp client authenticated successfully",
      },
    });
  });

  client.on("auth_failure", async (message) => {
    await db.whatsAppSession.update({
      where: { id: sessionId },
      data: {
        status: WhatsAppSessionStatus.FAILED,
      },
    });

    await db.whatsAppConnectionLog.create({
      data: {
        organizationId,
        whatsappSessionId: sessionId,
        eventType: "auth_failure",
        message: String(message),
      },
    });
  });

  client.on("disconnected", async (reason) => {
    await db.whatsAppSession.update({
      where: { id: sessionId },
      data: {
        status: WhatsAppSessionStatus.DISCONNECTED,
        disconnectedAt: new Date(),
      },
    });

    await db.whatsAppConnectionLog.create({
      data: {
        organizationId,
        whatsappSessionId: sessionId,
        eventType: "disconnected",
        message: String(reason),
      },
    });
  });

  await client.initialize();
  clients.set(sessionKey, client);
  return client;
}

export async function sendWhatsappMessage(sessionKey: string, phoneNumber: string, message: string) {
  const client = clients.get(sessionKey);
  if (!client) throw new Error("WhatsApp client not initialized");

  return client.sendMessage(toWhatsappJid(phoneNumber), message);
}

export function getWhatsappSessionStoragePath(sessionKey: string) {
  return path.join(env.WHATSAPP_SESSION_ROOT, `.wwebjs_auth/session-${sessionKey}`);
}
