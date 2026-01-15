import { verifyToken } from '@clerk/backend';
import type { Request } from 'express';
import { prisma } from '@aflow/db';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  clerkUserId?: string;
}

/**
 * Extracts the Clerk session token from the Authorization header
 */
export function getClerkToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Verifies the Clerk session token and returns the user ID
 */
export async function verifyClerkSession(
  token: string,
): Promise<string | null> {
  try {
    const { sub } = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
      jwtKey: process.env.CLERK_JWT_KEY,
    });
    // sub contains the Clerk user ID
    return sub || null;
  } catch (error) {
    console.error('Error verifying Clerk session:', error);
    return null;
  }
}

/**
 * Gets or creates a local User record for the given Clerk user ID
 * Implements lazy user provisioning
 */
export async function getOrCreateUser(
  clerkUserId: string,
): Promise<{ id: string; clerkUserId: string }> {
  // Try to find existing user
  let user = await prisma.user.findUnique({
    where: { clerkUserId },
    select: { id: true, clerkUserId: true },
  });

  // If user doesn't exist, create it
  if (!user) {
    user = await prisma.user.create({
      data: { clerkUserId },
      select: { id: true, clerkUserId: true },
    });
  }

  return user;
}

/**
 * Middleware to require authentication and set user context on request
 * Returns 401 if not authenticated
 */
export async function requireAuth(
  req: AuthenticatedRequest,
): Promise<{ userId: string; clerkUserId: string } | null> {
  const token = getClerkToken(req);
  if (!token) {
    return null;
  }

  const clerkUserId = await verifyClerkSession(token);
  if (!clerkUserId) {
    return null;
  }

  const user = await getOrCreateUser(clerkUserId);
  req.userId = user.id;
  req.clerkUserId = clerkUserId;

  return { userId: user.id, clerkUserId };
}
