import { apiClient } from '@/core/http/apiClient';
import {
  parseAccountProfile,
  parseActivity,
  parsePreferences,
  parseSessions,
} from '../schemas/profileSchema';
import type {
  AccountProfile,
  ActiveSession,
  ActivityEntry,
  Preferences,
} from '../types/profile';

/** The module's only calls to the API. Components never fetch directly. */

export function getAccountProfile(): Promise<AccountProfile> {
  return apiClient.get<AccountProfile>('/me', { parse: parseAccountProfile });
}

export function updateProfile(changes: {
  phone?: string;
}): Promise<AccountProfile> {
  return apiClient.patch<AccountProfile>('/me', {
    body: changes,
    parse: parseAccountProfile,
  });
}

export function getPreferences(): Promise<Preferences> {
  return apiClient.get<Preferences>('/me/preferences', {
    parse: parsePreferences,
  });
}

export function updatePreferences(changes: {
  language?: string;
  appearance?: string;
}): Promise<Preferences> {
  return apiClient.patch<Preferences>('/me/preferences', {
    body: changes,
    parse: parsePreferences,
  });
}

export function changePassword(request: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ success: true }> {
  return apiClient.post<{ success: true }>('/me/password', { body: request });
}

export function getSessions(): Promise<ActiveSession[]> {
  return apiClient.get<ActiveSession[]>('/auth/sessions', {
    parse: parseSessions,
  });
}

export function endSession(sessionId: string): Promise<{ success: true }> {
  return apiClient.delete<{ success: true }>(`/auth/sessions/${sessionId}`);
}

export function getActivity(): Promise<ActivityEntry[]> {
  return apiClient.get<ActivityEntry[]>('/me/activity', {
    parse: parseActivity,
  });
}
