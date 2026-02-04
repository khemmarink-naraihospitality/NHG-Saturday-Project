import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Role } from '../types/auth';

interface UserState {
    currentUser: User;
    setUser: (user: User) => void;
    setRole: (role: Role) => void;
}

const DEFAULT_USER: User = {
    id: 'u1',
    name: 'Demo User',
    avatar: 'DU',
    role: 'owner', // Default to highest permission
    system_role: 'user'
};

export const useUserStore = create<UserState>()(
    persist(
        (set) => ({
            currentUser: DEFAULT_USER,
            setUser: (user) => set({ currentUser: user }),
            setRole: (role) => set((state) => ({
                currentUser: { ...state.currentUser, role }
            })),
        }),
        {
            name: 'nhg-saturday-user-storage',
        }
    )
);
