import { api } from '../../lib/http';
import type {
  AdminGlossaryList,
  AdminGlossaryTerm,
  CreateGlossaryTermRequest,
  GlossaryList,
  UpdateGlossaryTermRequest,
} from '../../types/api';

const id = (value: string) => encodeURIComponent(value);

export const glossaryApi = {
  list: (signal?: AbortSignal) =>
    api.get<GlossaryList>('/glossary', { signal }),

  adminList: (signal?: AbortSignal) =>
    api.get<AdminGlossaryList>('/admin/glossary', { signal }),

  adminGet: (termId: string, signal?: AbortSignal) =>
    api.get<AdminGlossaryTerm>(`/admin/glossary/${id(termId)}`, { signal }),

  create: (body: CreateGlossaryTermRequest) =>
    api.post<AdminGlossaryTerm>('/admin/glossary', body),

  update: (termId: string, body: UpdateGlossaryTermRequest) =>
    api.patch<AdminGlossaryTerm>(`/admin/glossary/${id(termId)}`, body),

  remove: (termId: string) => api.delete<void>(`/admin/glossary/${id(termId)}`),
};
