// Re-export Prisma types
export * from '@prisma/client';

// API Types
export interface Company {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  isActive: boolean;
  plan: string;
  maxBranches: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Branch {
  id: string;
  companyId: string;
  name: string;
  code: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  isActive: boolean;
  opensAt?: string | null;
  closesAt?: string | null;
  createdAt: Date;
  updatedAt: Date;
  company?: Company;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
  role: UserRole;
  phone?: string | null;
  isActive: boolean;
  companyId?: string | null;
  branchId?: string | null;
  lastLogin?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  company?: Company | null;
  branch?: Branch | null;
}

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  icon?: string | null;
  companyId: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: { dishes: number };
}

export interface Dish {
  id: string;
  companyId: string;
  categoryId?: string | null;
  name: string;
  description?: string | null;
  image?: string | null;
  sku?: string | null;
  prepTime?: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  category?: Category | null;
  _count?: { checklistItems: number; qualityReports: number };
}

export interface QualityChecklistItem {
  id: string;
  dishId: string;
  name: string;
  description?: string | null;
  type: CriterionType;
  isRequired: boolean;
  weight: number;
  minValue?: number | null;
  maxValue?: number | null;
  passingScore?: number | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface QualityReportItem {
  id: string;
  reportId: string;
  checklistItemId: string;
  scoreValue?: number | null;
  booleanValue?: boolean | null;
  textValue?: string | null;
  isPassed: boolean;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  checklistItem?: QualityChecklistItem;
}

export interface QualityReport {
  id: string;
  branchId: string;
  dishId: string;
  userId: string;
  shift: Shift;
  evaluationDate: Date;
  status: QualityStatus;
  overallScore?: number | null;
  exitTime?: number | null;
  photoUrl?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  branch?: Branch;
  dish?: Dish;
  user?: User;
  items?: QualityReportItem[];
}

export interface Incident {
  id: string;
  branchId: string;
  dishId?: string | null;
  qualityReportId?: string | null;
  userId: string;
  incidentType: string;
  description: string;
  severity: string;
  status: IncidentStatus;
  correctiveAction?: string | null;
  resolvedAt?: Date | null;
  resolvedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  branch?: Branch;
  dish?: Dish | null;
  user?: User;
}

export interface Alert {
  id: string;
  branchId: string;
  alertType: AlertType;
  title: string;
  message: string;
  status: AlertStatus;
  threshold?: number | null;
  currentValue?: number | null;
  relatedIds?: string | null;
  acknowledgedBy?: string | null;
  acknowledgedAt?: Date | null;
  closedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  branch?: Branch;
}

export interface AuditLog {
  id: string;
  companyId?: string | null;
  branchId?: string | null;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValues?: string | null;
  newValues?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
  user?: User | null;
  branch?: Branch | null;
}

// Dashboard KPI Types
export interface DashboardKPIs {
  totalReports: number;
  approvalRate: number;
  avgExitTime: number;
  pendingIncidents: number;
  activeAlerts: number;
  topDishes: { dishId: string; dishName: string; count: number }[];
  branchPerformance: { branchId: string; branchName: string; approvalRate: number }[];
  dailyTrend: { date: string; reports: number; approvalRate: number }[];
  recentReports: QualityReport[];
  recentIncidents: Incident[];
}

// Form Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
  companyId?: string;
  branchId?: string;
  phone?: string;
}

export interface CompanyFormData {
  name: string;
  slug: string;
  logo?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  isActive?: boolean;
  plan?: string;
  maxBranches?: number;
}

export interface BranchFormData {
  name: string;
  code: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  isActive?: boolean;
  opensAt?: string;
  closesAt?: string;
}

export interface DishFormData {
  name: string;
  description?: string;
  categoryId?: string;
  image?: string;
  sku?: string;
  prepTime?: number;
  isActive?: boolean;
}

export interface CategoryFormData {
  name: string;
  description?: string;
  color: string;
  icon?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface QualityReportFormData {
  branchId: string;
  dishId: string;
  shift: Shift;
  evaluationDate: Date;
  exitTime?: number;
  photoUrl?: string;
  notes?: string;
  items: {
    checklistItemId: string;
    scoreValue?: number;
    booleanValue?: boolean;
    textValue?: string;
    isPassed: boolean;
    notes?: string;
  }[];
}

export interface IncidentFormData {
  branchId: string;
  dishId?: string;
  qualityReportId?: string;
  incidentType: string;
  description: string;
  severity: string;
  correctiveAction?: string;
}
