import { apiClient } from '@/core/http/apiClient';
import { parseAuthSession, parseAuthUser } from '../schemas/authSchema';
import type { AuthSession, AuthUser } from '../types/auth';

export function login(email: string, password: string): Promise<AuthSession> {
  return apiClient.post<AuthSession>('/auth/login', {
    body: { email, password },
    parse: parseAuthSession,
  });
}

export function getCurrentUser(): Promise<AuthUser> {
  return apiClient.get<AuthUser>('/auth/me', { parse: parseAuthUser });
}

export function logout(): Promise<{ success: true }> {
  return apiClient.post<{ success: true }>('/auth/logout');
}
