import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { queryKeys } from './keys';
import { queryPersisterOption } from './persist';
import { runOfflineAware } from '../offline/queue';
import { queryClient } from '../queryClient';
import type { Profile, ProfileDraft } from '../types/profile';

/** Réponse du GET /profile quand aucun profil n'existe encore. */
export interface ProfileResponse extends Partial<Profile> {
  onboarded?: boolean;
}

export async function getProfile(): Promise<ProfileResponse> {
  const { data } = await api.get<ProfileResponse>('/profile');
  return data;
}

export async function saveProfile(
  draft: ProfileDraft & { syncTargets?: boolean },
): Promise<ProfileResponse> {
  // PUT /profile est une mise à jour absolue → rejet rejouable offline tel quel.
  const cached = queryClient.getQueryData<ProfileResponse>(queryKeys.profile);
  return runOfflineAware({
    method: 'put',
    url: '/profile',
    body: draft,
    invalidates: [['profile']],
    label: 'Enregistrer le profil',
    synthetic: () => ({ ...(cached ?? {}), ...draft }),
    request: async () => {
      const { data } = await api.put<ProfileResponse>('/profile', draft);
      return data;
    },
  });
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
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: getProfile,
    staleTime: 60_000,
    persister: queryPersisterOption,
  });
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
