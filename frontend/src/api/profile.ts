import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { queryKeys } from './keys';
import type { Profile, ProfileDraft } from '../types/profile';

/** Réponse du GET /profile quand aucun profil n'existe encore. */
export interface ProfileResponse extends Partial<Profile> {
  onboarded?: boolean;
}

export async function getProfile(): Promise<ProfileResponse> {
  const { data } = await api.get<ProfileResponse>('/profile');
  return data;
}

export async function saveProfile(draft: ProfileDraft): Promise<Profile> {
  const { data } = await api.put<Profile>('/profile', draft);
  return data;
}

export async function uploadProfileImage(file: File): Promise<Profile> {
  const form = new FormData();
  form.append('image', file);
  const { data } = await api.post<Profile>('/profile/image', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export function useProfile() {
  return useQuery({ queryKey: queryKeys.profile, queryFn: getProfile, staleTime: 60_000 });
}

export function useSaveProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveProfile,
    onSuccess: (data) => {
      // La réponse du PUT contient les objectifs recalculés → cache mis à
      // jour immédiatement (pas d'attente du refetch), puis invalidation.
      qc.setQueryData(queryKeys.profile, data);
      qc.invalidateQueries({ queryKey: queryKeys.profile });
    },
  });
}

export function useUploadProfileImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: uploadProfileImage,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.profile }),
  });
}
