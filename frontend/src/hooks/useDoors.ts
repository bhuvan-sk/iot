import { create } from 'zustand';

export interface DoorState {
  isOpen: boolean;
}

interface DoorsStore {
  doors: Record<string, DoorState>;
  toggleDoor: (id: string) => void;
  setDoor: (id: string, isOpen: boolean) => void;
}

export const useDoors = create<DoorsStore>((set) => ({
  doors: {
    bedroom: { isOpen: false },
    garage: { isOpen: false },
  },
  toggleDoor: (id) => set((state) => ({
    doors: {
      ...state.doors,
      [id]: { isOpen: !state.doors[id]?.isOpen }
    }
  })),
  setDoor: (id, isOpen) => set((state) => ({
    doors: {
      ...state.doors,
      [id]: { isOpen }
    }
  }))
}));
