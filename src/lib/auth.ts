import bcrypt from 'bcrypt';
import { db } from './db';
import { UserRole } from '@prisma/client';

const SALT_ROUNDS = 12;

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId: string | null;
  branchId: string | null;
  avatar?: string | null;
}

export interface SessionUser extends AuthUser {
  company?: { id: string; name: string; slug: string } | null;
  branch?: { id: string; name: string; code: string } | null;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Authenticate user
export async function authenticateUser(email: string, password: string): Promise<SessionUser | null> {
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      company: { select: { id: true, name: true, slug: true } },
      branch: { select: { id: true, name: true, code: true } },
    },
  });

  if (!user || !user.isActive) {
    return null;
  }

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    return null;
  }

  // Update last login
  await db.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    companyId: user.companyId,
    branchId: user.branchId,
    avatar: user.avatar,
    company: user.company,
    branch: user.branch,
  };
}

// Create user with hashed password
export async function createUser(data: {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  companyId?: string;
  branchId?: string;
  phone?: string;
}): Promise<{ id: string; email: string; name: string; role: UserRole }> {
  const hashedPassword = await hashPassword(data.password);

  const user = await db.user.create({
    data: {
      email: data.email.toLowerCase(),
      password: hashedPassword,
      name: data.name,
      role: data.role,
      companyId: data.companyId || null,
      branchId: data.branchId || null,
      phone: data.phone,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  return user;
}

// Role hierarchy for permission checks
const ROLE_HIERARCHY: Record<UserRole, number> = {
  SUPER_ADMIN: 100,
  COMPANY_ADMIN: 80,
  BRANCH_MANAGER: 60,
  SUPERVISOR: 40,
  AUDITOR: 20,
};

// Check if user has required role or higher
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

// Check if user can access company data
export function canAccessCompany(user: SessionUser, companyId: string): boolean {
  if (user.role === 'SUPER_ADMIN') return true;
  return user.companyId === companyId;
}

// Check if user can access branch data
export function canAccessBranch(user: SessionUser, branchId: string): boolean {
  if (user.role === 'SUPER_ADMIN') return true;
  if (user.role === 'COMPANY_ADMIN') {
    // Company admin can access all branches in their company
    return true; // Additional check needed in query
  }
  return user.branchId === branchId;
}

// Get accessible branch IDs for a user
export async function getAccessibleBranchIds(user: SessionUser): Promise<string[]> {
  if (user.role === 'SUPER_ADMIN') {
    const branches = await db.branch.findMany({ select: { id: true } });
    return branches.map(b => b.id);
  }

  if (user.role === 'COMPANY_ADMIN' && user.companyId) {
    const branches = await db.branch.findMany({
      where: { companyId: user.companyId },
      select: { id: true },
    });
    return branches.map(b => b.id);
  }

  if (user.branchId) {
    return [user.branchId];
  }

  return [];
}
