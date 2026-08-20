import { create } from 'zustand';

export interface Note {
  id: number | string;
  title: string;
  content: string;
  category_id: number | null;
  category_name?: string;
  is_mcp_enabled: number;
  created_at: string;
  updated_at: string;
  isDraft?: boolean;
}

export interface Category {
  id: number;
  name: string;
}

interface State {
  notes: Note[];
  categories: Category[];
  activeTabs: Note[];
  currentTabId: number | string | null;
  settings: Record<string, string>;
  stats: any;
  setNotes: (notes: Note[]) => void;
  setCategories: (cats: Category[]) => void;
  openTab: (note: Note) => void;
  closeTab: (id: number | string) => void;
  setCurrentTab: (id: number | string | null) => void;
  updateActiveTabContent: (content: string) => void;
  updateActiveTabTitle: (title: string) => void;
  updateTabId: (oldId: string | number, newNote: Note) => void;
  updateTab: (id: string | number, payload: Partial<Note>) => void;
  setSettings: (settings: Record<string, string>) => void;
  setStats: (stats: any) => void;
}

export const useStore = create<State>((set) => ({
  notes: [],
  categories: [],
  activeTabs: [],
  currentTabId: null,
  settings: {},
  stats: null,
  setNotes: (notes) => set({ notes }),
  setCategories: (categories) => set({ categories }),
  openTab: (note) => set((state) => {
    const exists = state.activeTabs.find(t => t.id === note.id);
    if (!exists) {
      return { activeTabs: [...state.activeTabs, note], currentTabId: note.id };
    }
    return { currentTabId: note.id };
  }),
  closeTab: (id) => set((state) => {
    const newTabs = state.activeTabs.filter(t => t.id !== id);
    let newCurrent = state.currentTabId;
    if (state.currentTabId === id) {
      newCurrent = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
    }
    return { activeTabs: newTabs, currentTabId: newCurrent };
  }),
  setCurrentTab: (id) => set({ currentTabId: id }),
  updateActiveTabContent: (content) => set((state) => ({
    activeTabs: state.activeTabs.map(t => t.id === state.currentTabId ? { ...t, content } : t)
  })),
  updateActiveTabTitle: (title) => set((state) => ({
    activeTabs: state.activeTabs.map(t => t.id === state.currentTabId ? { ...t, title } : t)
  })),
  updateTabId: (oldId, newNote) => set((state) => {
    return {
      activeTabs: state.activeTabs.map(t => t.id === oldId ? { ...newNote, isDraft: false } : t),
      currentTabId: state.currentTabId === oldId ? newNote.id : state.currentTabId
    }
  }),
  updateTab: (id, payload) => set((state) => ({
    activeTabs: state.activeTabs.map(t => t.id === id ? { ...t, ...payload } : t)
  })),
  setSettings: (settings) => set({ settings }),
  setStats: (stats) => set({ stats })
}));
