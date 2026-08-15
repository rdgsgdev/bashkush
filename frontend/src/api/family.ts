import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { queryKeys } from './keys';
import type { FamilyMemberView } from '../types/family';

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
