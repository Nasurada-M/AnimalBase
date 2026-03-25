import { createContext, useContext } from 'react';
import { useAuthViewModel } from '../viewmodels/AuthViewModel';
import { usePetViewModel } from '../viewmodels/PetViewModel';

export type AuthVM = ReturnType<typeof useAuthViewModel>;
export type PetVM  = ReturnType<typeof usePetViewModel>;

export const AuthContext = createContext<AuthVM>({} as AuthVM);
export const PetContext  = createContext<PetVM>({} as PetVM);

export const useAuth = () => useContext(AuthContext);
export const usePets = () => useContext(PetContext);