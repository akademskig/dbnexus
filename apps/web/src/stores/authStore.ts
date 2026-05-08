import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, User, AuthApiError } from '../lib/authApi';

interface AuthState {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    tokenExpiresAt: number | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    authEnabled: boolean | null;
    error: string | null;

    // Actions
    checkAuthStatus: () => Promise<void>;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name?: string) => Promise<void>;
    logout: () => Promise<void>;
    logoutAll: () => Promise<void>;
    refreshAccessToken: () => Promise<boolean>;
    clearError: () => void;
    getValidToken: () => Promise<string | null>;
}

const TOKEN_REFRESH_BUFFER = 60 * 1000; // Refresh 1 minute before expiry

// Refresh lock to prevent concurrent refresh attempts
let refreshPromise: Promise<boolean> | null = null;

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            accessToken: null,
            refreshToken: null,
            tokenExpiresAt: null,
            isAuthenticated: false,
            isLoading: false,
            authEnabled: null,
            error: null,

            checkAuthStatus: async () => {
                try {
                    const status = await authApi.getStatus();
                    set({ authEnabled: status.authEnabled });

                    // If no users exist yet, don't set isAuthenticated - let user create admin account
                    if (!status.authEnabled) {
                        set({ isAuthenticated: false, user: null });
                        return;
                    }

                    const { accessToken, refreshToken, tokenExpiresAt } = get();

                    if (!accessToken || !refreshToken) {
                        set({ isAuthenticated: false });
                        return;
                    }

                    if (tokenExpiresAt && Date.now() > tokenExpiresAt - TOKEN_REFRESH_BUFFER) {
                        const refreshed = await get().refreshAccessToken();
                        if (!refreshed) {
                            set({
                                isAuthenticated: false,
                                user: null,
                                accessToken: null,
                                refreshToken: null,
                            });
                            return;
                        }
                    }

                    const user = await authApi.getMe(get().accessToken!);
                    set({ user, isAuthenticated: true });
                } catch {
                    set({
                        isAuthenticated: false,
                        user: null,
                        accessToken: null,
                        refreshToken: null,
                    });
                }
            },

            login: async (email: string, password: string) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await authApi.login({ email, password });
                    const tokenExpiresAt = Date.now() + response.tokens.expiresIn * 1000;

                    set({
                        user: response.user,
                        accessToken: response.tokens.accessToken,
                        refreshToken: response.tokens.refreshToken,
                        tokenExpiresAt,
                        isAuthenticated: true,
                        isLoading: false,
                    });
                } catch (err) {
                    const message = err instanceof AuthApiError ? err.message : 'Login failed';
                    set({ error: message, isLoading: false });
                    throw err;
                }
            },

            register: async (email: string, password: string, name?: string) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await authApi.register({ email, password, name });
                    const tokenExpiresAt = Date.now() + response.tokens.expiresIn * 1000;

                    set({
                        user: response.user,
                        accessToken: response.tokens.accessToken,
                        refreshToken: response.tokens.refreshToken,
                        tokenExpiresAt,
                        isAuthenticated: true,
                        authEnabled: true,
                        isLoading: false,
                    });
                } catch (err) {
                    const message =
                        err instanceof AuthApiError ? err.message : 'Registration failed';
                    set({ error: message, isLoading: false });
                    throw err;
                }
            },

            logout: async () => {
                const { accessToken, refreshToken } = get();
                if (accessToken && refreshToken) {
                    try {
                        await authApi.logout(refreshToken, accessToken);
                    } catch {
                        // Ignore logout errors
                    }
                }
                set({
                    user: null,
                    accessToken: null,
                    refreshToken: null,
                    tokenExpiresAt: null,
                    isAuthenticated: false,
                });
            },

            logoutAll: async () => {
                const { accessToken } = get();
                if (accessToken) {
                    try {
                        await authApi.logoutAll(accessToken);
                    } catch {
                        // Ignore logout errors
                    }
                }
                set({
                    user: null,
                    accessToken: null,
                    refreshToken: null,
                    tokenExpiresAt: null,
                    isAuthenticated: false,
                });
            },

            refreshAccessToken: async () => {
                const { refreshToken } = get();
                if (!refreshToken) return false;

                // If a refresh is already in progress, wait for it
                if (refreshPromise) {
                    return refreshPromise;
                }

                // Start the refresh and store the promise
                refreshPromise = (async () => {
                    try {
                        const tokens = await authApi.refresh(refreshToken);
                        const tokenExpiresAt = Date.now() + tokens.expiresIn * 1000;

                        set({
                            accessToken: tokens.accessToken,
                            refreshToken: tokens.refreshToken,
                            tokenExpiresAt,
                        });
                        return true;
                    } catch {
                        set({
                            user: null,
                            accessToken: null,
                            refreshToken: null,
                            tokenExpiresAt: null,
                            isAuthenticated: false,
                        });
                        return false;
                    } finally {
                        refreshPromise = null;
                    }
                })();

                return refreshPromise;
            },

            clearError: () => set({ error: null }),

            getValidToken: async () => {
                const { accessToken, tokenExpiresAt, authEnabled } = get();

                if (authEnabled === false) {
                    return null;
                }

                if (!accessToken) return null;

                if (tokenExpiresAt && Date.now() > tokenExpiresAt - TOKEN_REFRESH_BUFFER) {
                    const refreshed = await get().refreshAccessToken();
                    if (!refreshed) return null;
                }

                return get().accessToken;
            },
        }),
        {
            name: 'dbnexus-auth',
            partialize: (state) => ({
                accessToken: state.accessToken,
                refreshToken: state.refreshToken,
                tokenExpiresAt: state.tokenExpiresAt,
                user: state.user,
            }),
        }
    )
);
