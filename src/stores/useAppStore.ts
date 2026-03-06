import { create } from 'zustand';

interface AppState {
  empresaId: string | null;
  darkMode: boolean;
  setEmpresaId: (id: string | null) => void;
  toggleDarkMode: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  empresaId: null,
  darkMode: true,
  setEmpresaId: (id) => set({ empresaId: id }),
  toggleDarkMode: () => set((state) => {
    const next = !state.darkMode;
    if (next) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    return { darkMode: next };
  }),
}));
