import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CompanySelectionState {
  selectedCompanyId: string | null;
  setSelectedCompanyId: (companyId: string | null) => void;
}

export const useCompanySelectionStore = create<CompanySelectionState>()(
  persist(
    (set) => ({
      selectedCompanyId: null,
      setSelectedCompanyId: (companyId) => set({ selectedCompanyId: companyId }),
    }),
    {
      name: 'kqs-company-selection',
    }
  )
);
