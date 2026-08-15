import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { queryKeys } from './keys';
import type { FamilyInvitationView, FamilyMemberView } from '../types/family';

export async function getFamily(): Promise<FamilyMemberView[]> {
  const { data } = await api.get<FamilyMemberView[]>('/family');
  return data;
}

export async function addFamilyMember(email: string): Promise<unknown> {
  const { data } = await api.post('/family', { email });
  return data;
}

export async function removeFamilyMember(id: string): Promise<void> {
  await api.delete(`/family/${id}`);
}

export async function getFamilyInvitations(): Promise<FamilyInvitationView[]> {
  const { data } = await api.get<FamilyInvitationView[]>('/family/invitations');
  return data;
}

export async function acceptFamilyInvitation(id: string): Promise<void> {
  await api.post(`/family/invitations/${id}/accept`);
}

export async function declineFamilyInvitation(id: string): Promise<void> {
  await api.post(`/family/invitations/${id}/decline`);
}

export function useFamily() {
  return useQuery({ queryKey: queryKeys.family, queryFn: getFamily, staleTime: 60_000 });
}

export function useAddFamilyMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: addFamilyMember,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.family }),
  });
}

export function useRemoveFamilyMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: removeFamilyMember,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.family }),
  });
}

export function useFamilyInvitations() {
  return useQuery({
    queryKey: queryKeys.familyInvitations,
    queryFn: getFamilyInvitations,
    staleTime: 60_000,
  });
}

export function useAcceptFamilyInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: acceptFamilyInvitation,
    // La famille change → on rafraîchit aussi les données scopées famille.
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useDeclineFamilyInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: declineFamilyInvitation,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.familyInvitations }),
  });
}
