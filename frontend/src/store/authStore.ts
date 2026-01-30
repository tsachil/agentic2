import { create } from 'zustand';
import { apiClient } from '../api/client';
import { jwtDecode } from "jwt-decode";

interface User {
  email: string;
  id?: number;
  full_name?: string;
  role?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  login: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  user: localStorage.getItem('token') ? jwtDecode(localStorage.getItem('token')!) : null,
  login: (token) => {
    localStorage.setItem('token', token);
    const user = jwtDecode<User>(token);
    set({ token, user });
    
    // Fetch full user profile
    apiClient.get('/users/me').then(res => {
        set(state => ({ ...state, user: { ...state.user, ...res.data } }));
    }).catch(console.error);
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, user: null });
  },
}));
