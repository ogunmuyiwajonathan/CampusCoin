import { createContext } from "react";

/** Shared auth state - imported by AuthProvider (writes) and useAuth (reads). */
export const AuthContext = createContext(null);
export const STORAGE_KEY = "campuscoin.session";
