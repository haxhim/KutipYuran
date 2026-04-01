import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { COOKIE_SESSION_NAME } from "@/lib/constants";
import type { AuthPayload, SessionUser } from "@/types";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string, metadata?: { ipAddress?: string; userAgent?: string }) {
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);
  const session = await db.session.create({
    data: {
      userId,
      token: crypto.randomUUID(),
      expiresAt,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    },
  });

  const payload: AuthPayload = { sessionId: session.id, userId };
  const signed = jwt.sign(payload, env.JWT_SECRET, { expiresIn: "14d" });

  (await cookies()).set(COOKIE_SESSION_NAME, signed, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return session;
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE_SESSION_NAME)?.value;

  if (token) {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
    await db.session.update({
      where: { id: payload.sessionId },
      data: { revokedAt: new Date() },
    }).catch(() => null);
  }

  store.delete(COOKIE_SESSION_NAME);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_SESSION_NAME)?.value;

  if (!token) return null;

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
    const session = await db.session.findUnique({
      where: { id: payload.sessionId },
      include: {
        user: {
          include: {
            memberships: true,
          },
        },
      },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      return null;
    }

    return {
      id: session.user.id,
      email: session.user.email,
      fullName: session.user.fullName,
      isPlatformAdmin: session.user.isPlatformAdmin,
      memberships: session.user.memberships.map((membership) => ({
        organizationId: membership.organizationId,
        role: membership.role,
      })),
    };
  } catch {
    return null;
  }
}

