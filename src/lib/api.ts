// API client for KQS
import { useAuthStore } from '@/store/auth-store';

const API_BASE = '/api';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<{ success: boolean; data?: T; error?: string; pagination?: { page: number; limit: number; total: number; totalPages: number } }> {
  const { params, ...fetchOptions } = options;
  
  // Get auth state
  const authState = useAuthStore.getState();
  const user = authState.user;

  // Build URL with query params
  let url = `${API_BASE}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  // Add auth headers
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add user context headers for backend authorization
  if (user) {
    headers['x-user-id'] = user.id;
    headers['x-user-role'] = user.role;
    if (user.companyId) headers['x-user-company-id'] = user.companyId;
    if (user.branchId) headers['x-user-branch-id'] = user.branchId;
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    // Try to parse JSON response
    let data;
    try {
      data = await response.json();
    } catch {
      // If not JSON, return error
      return {
        success: false,
        error: `HTTP error: ${response.status} ${response.statusText}`,
      };
    }

    return data;
  } catch (err) {
    // Network error or other fetch error
    console.error('API request error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<{ user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  
  logout: () =>
    apiRequest('/auth/logout', { method: 'POST' }),
  
  me: () =>
    apiRequest<{ user: any }>('/auth/me'),
};

// Companies API
export const companiesApi = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    apiRequest<any[]>('/companies', { params }),
  
  get: (id: string) =>
    apiRequest<any>(`/companies/${id}`),
  
  create: (data: any) =>
    apiRequest<any>('/companies', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: any) =>
    apiRequest<any>(`/companies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  delete: (id: string) =>
    apiRequest(`/companies/${id}`, { method: 'DELETE' }),
};

// Branches API
export const branchesApi = {
  list: (params?: { page?: number; limit?: number; companyId?: string; search?: string }) =>
    apiRequest<any[]>('/branches', { params }),
  
  get: (id: string) =>
    apiRequest<any>(`/branches/${id}`),
  
  create: (data: any) =>
    apiRequest<any>('/branches', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: any) =>
    apiRequest<any>(`/branches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  delete: (id: string) =>
    apiRequest(`/branches/${id}`, { method: 'DELETE' }),
};

// Users API
export const usersApi = {
  list: (params?: { page?: number; limit?: number; companyId?: string; branchId?: string; role?: string; search?: string }) =>
    apiRequest<any[]>('/users', { params }),
  
  get: (id: string) =>
    apiRequest<any>(`/users/${id}`),
  
  create: (data: any) =>
    apiRequest<any>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: any) =>
    apiRequest<any>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  delete: (id: string) =>
    apiRequest(`/users/${id}`, { method: 'DELETE' }),
};

// Categories API
export const categoriesApi = {
  list: (params?: { page?: number; limit?: number; companyId?: string; search?: string }) =>
    apiRequest<any[]>('/categories', { params }),
  
  get: (id: string) =>
    apiRequest<any>(`/categories/${id}`),
  
  create: (data: any) =>
    apiRequest<any>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: any) =>
    apiRequest<any>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  delete: (id: string) =>
    apiRequest(`/categories/${id}`, { method: 'DELETE' }),
};

// Dishes API
export const dishesApi = {
  list: (params?: { page?: number; limit?: number; companyId?: string; categoryId?: string; isActive?: boolean; search?: string }) =>
    apiRequest<any[]>('/dishes', { params }),
  
  get: (id: string) =>
    apiRequest<any>(`/dishes/${id}`),
  
  create: (data: any) =>
    apiRequest<any>('/dishes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: any) =>
    apiRequest<any>(`/dishes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  delete: (id: string) =>
    apiRequest(`/dishes/${id}`, { method: 'DELETE' }),
};

// Checklists API
export const checklistsApi = {
  list: (dishId: string) =>
    apiRequest<any[]>('/checklists', { params: { dishId } }),
  
  get: (id: string) =>
    apiRequest<any>(`/checklists/${id}`),
  
  create: (data: any) =>
    apiRequest<any>('/checklists', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: any) =>
    apiRequest<any>(`/checklists/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  delete: (id: string) =>
    apiRequest(`/checklists/${id}`, { method: 'DELETE' }),
};

// Quality Reports API
export const qualityReportsApi = {
  list: (params?: { page?: number; limit?: number; branchId?: string; dishId?: string; status?: string; startDate?: string; endDate?: string }) =>
    apiRequest<any[]>('/quality-reports', { params }),
  
  get: (id: string) =>
    apiRequest<any>(`/quality-reports/${id}`),
  
  create: (data: any) =>
    apiRequest<any>('/quality-reports', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Incidents API
export const incidentsApi = {
  list: (params?: { page?: number; limit?: number; branchId?: string; status?: string; severity?: string }) =>
    apiRequest<any[]>('/incidents', { params }),
  
  get: (id: string) =>
    apiRequest<any>(`/incidents/${id}`),
  
  create: (data: any) =>
    apiRequest<any>('/incidents', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: any) =>
    apiRequest<any>(`/incidents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  delete: (id: string) =>
    apiRequest(`/incidents/${id}`, { method: 'DELETE' }),
};

// Alerts API
export const alertsApi = {
  list: (params?: { page?: number; limit?: number; branchId?: string; status?: string; alertType?: string }) =>
    apiRequest<any[]>('/alerts', { params }),
  
  get: (id: string) =>
    apiRequest<any>(`/alerts/${id}`),
  
  acknowledge: (id: string) =>
    apiRequest<any>(`/alerts/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ action: 'acknowledge' }),
    }),
  
  close: (id: string) =>
    apiRequest<any>(`/alerts/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ action: 'close' }),
    }),
};

// Dashboard API
export const dashboardApi = {
  getKpis: (params?: { startDate?: string; endDate?: string; companyId?: string }) =>
    apiRequest<any>('/dashboard', { params }),
};

// Audit API
export const auditApi = {
  list: (params?: { page?: number; limit?: number; branchId?: string; entityType?: string; action?: string }) =>
    apiRequest<any[]>('/audit', { params }),
};

// Permissions API
export const permissionsApi = {
  list: (params?: { companyId?: string }) =>
    apiRequest<any[]>('/permissions', { params }),
  
  update: (data: any) =>
    apiRequest<any>('/permissions', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  reset: (role: string, companyId?: string) =>
    apiRequest<any>('/permissions', {
      method: 'POST',
      body: JSON.stringify({ role, companyId }),
    }),
};

// Checklist Templates API
export const checklistTemplatesApi = {
  list: (params?: { page?: number; limit?: number; companyId?: string }) =>
    apiRequest<any[]>('/checklist-templates', { params }),
  
  get: (id: string) =>
    apiRequest<any>(`/checklist-templates/${id}`),
  
  create: (data: any) =>
    apiRequest<any>('/checklist-templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: any) =>
    apiRequest<any>(`/checklist-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  delete: (id: string) =>
    apiRequest(`/checklist-templates/${id}`, { method: 'DELETE' }),
  
  applyToDishes: (templateId: string, dishIds: string[]) =>
    apiRequest<any>('/checklist-templates/apply', {
      method: 'POST',
      body: JSON.stringify({ templateId, dishIds }),
    }),
};
