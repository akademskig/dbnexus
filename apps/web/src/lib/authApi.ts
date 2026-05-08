const API_BASE = '/api';

export interface User {
    id: string;
    email: string;
    name: string | null;
    role: 'admin' | 'editor' | 'viewer';
    createdAt: string;
    updatedAt: string;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

export interface AuthResponse {
    user: User;
    tokens: AuthTokens;
}

export interface AuthStatus {
    authEnabled: boolean;
    hasUsers: boolean;
}

class AuthApiError extends Error {
    constructor(
        message: string,
        public statusCode: number
    ) {
        super(message);
        this.name = 'AuthApiError';
    }
}

async function fetchAuthApi<T>(
    endpoint: string,
    options?: RequestInit,
    accessToken?: string
): Promise<T> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options?.headers as Record<string, string>),
    };

    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new AuthApiError(error.message || `HTTP ${response.status}`, response.status);
    }

    return response.json();
}

export const authApi = {
    getStatus: () => fetchAuthApi<AuthStatus>('/auth/status'),

    register: (data: { email: string; password: string; name?: string }) =>
        fetchAuthApi<AuthResponse>('/auth/register', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    login: (data: { email: string; password: string }) =>
        fetchAuthApi<AuthResponse>('/auth/login', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    refresh: (refreshToken: string) =>
        fetchAuthApi<AuthTokens>('/auth/refresh', {
            method: 'POST',
            body: JSON.stringify({ refreshToken }),
        }),

    logout: (refreshToken: string, accessToken: string) =>
        fetchAuthApi<{ message: string }>(
            '/auth/logout',
            {
                method: 'POST',
                body: JSON.stringify({ refreshToken }),
            },
            accessToken
        ),

    logoutAll: (accessToken: string) =>
        fetchAuthApi<{ message: string }>(
            '/auth/logout-all',
            {
                method: 'POST',
            },
            accessToken
        ),

    getMe: (accessToken: string) => fetchAuthApi<User>('/auth/me', {}, accessToken),

    changePassword: (currentPassword: string, newPassword: string, accessToken: string) =>
        fetchAuthApi<{ message: string }>(
            '/auth/change-password',
            {
                method: 'POST',
                body: JSON.stringify({ currentPassword, newPassword }),
            },
            accessToken
        ),

    updateProfile: (updates: { name?: string }, accessToken: string) =>
        fetchAuthApi<User>(
            '/auth/update-profile',
            {
                method: 'POST',
                body: JSON.stringify(updates),
            },
            accessToken
        ),

    verifyPassword: (password: string, accessToken: string) =>
        fetchAuthApi<{ valid: boolean }>(
            '/auth/verify-password',
            {
                method: 'POST',
                body: JSON.stringify({ password }),
            },
            accessToken
        ),
};

export { AuthApiError };
