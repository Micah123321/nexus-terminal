import { defineStore } from 'pinia';
import { ref } from 'vue';
import apiClient from '../utils/apiClient';

export interface LoginCredentialBasicInfo {
    id: number;
    name: string;
    type: 'SSH' | 'RDP' | 'VNC';
    username: string;
    auth_method: 'password' | 'key';
    ssh_key_id?: number | null;
    notes?: string | null;
}

export interface LoginCredentialDetails extends LoginCredentialBasicInfo {
    password?: string;
    privateKey?: string;
    passphrase?: string;
}

export interface LoginCredentialInput {
    name: string;
    type: 'SSH' | 'RDP' | 'VNC';
    username: string;
    auth_method?: 'password' | 'key';
    password?: string;
    private_key?: string;
    passphrase?: string;
    ssh_key_id?: number | null;
    notes?: string | null;
}

export const useLoginCredentialsStore = defineStore('loginCredentials', () => {
    const loginCredentials = ref<LoginCredentialBasicInfo[]>([]);
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    async function fetchLoginCredentials() {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.get<LoginCredentialBasicInfo[]>('/login-credentials');
            loginCredentials.value = response.data;
        } catch (err: any) {
            console.error('Failed to fetch login credentials:', err);
            error.value = err.response?.data?.message || err.message || '获取登录凭证列表失败。';
        } finally {
            isLoading.value = false;
        }
    }

    async function addLoginCredential(payload: LoginCredentialInput): Promise<boolean> {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.post<{ message: string; credential: LoginCredentialBasicInfo }>('/login-credentials', payload);
            loginCredentials.value.unshift(response.data.credential);
            loginCredentials.value.sort((left, right) => left.name.localeCompare(right.name));
            return true;
        } catch (err: any) {
            console.error('Failed to add login credential:', err);
            error.value = err.response?.data?.message || err.message || '创建登录凭证失败。';
            return false;
        } finally {
            isLoading.value = false;
        }
    }

    async function fetchLoginCredentialDetails(id: number): Promise<LoginCredentialDetails | null> {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.get<LoginCredentialDetails>(`/login-credentials/${id}/details`);
            return response.data;
        } catch (err: any) {
            console.error(`Failed to fetch login credential ${id}:`, err);
            error.value = err.response?.data?.message || err.message || '获取登录凭证详情失败。';
            return null;
        } finally {
            isLoading.value = false;
        }
    }

    async function updateLoginCredential(id: number, payload: Partial<LoginCredentialInput>): Promise<boolean> {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.put<{ message: string; credential: LoginCredentialBasicInfo }>(`/login-credentials/${id}`, payload);
            const index = loginCredentials.value.findIndex((credential) => credential.id === id);
            if (index !== -1) {
                loginCredentials.value[index] = { ...loginCredentials.value[index], ...response.data.credential };
                loginCredentials.value.sort((left, right) => left.name.localeCompare(right.name));
            }
            return true;
        } catch (err: any) {
            console.error(`Failed to update login credential ${id}:`, err);
            error.value = err.response?.data?.message || err.message || '更新登录凭证失败。';
            return false;
        } finally {
            isLoading.value = false;
        }
    }

    async function deleteLoginCredential(id: number): Promise<boolean> {
        isLoading.value = true;
        error.value = null;
        try {
            await apiClient.delete(`/login-credentials/${id}`);
            loginCredentials.value = loginCredentials.value.filter((credential) => credential.id !== id);
            return true;
        } catch (err: any) {
            console.error(`Failed to delete login credential ${id}:`, err);
            error.value = err.response?.data?.message || err.message || '删除登录凭证失败。';
            return false;
        } finally {
            isLoading.value = false;
        }
    }

    return {
        loginCredentials,
        isLoading,
        error,
        fetchLoginCredentials,
        addLoginCredential,
        fetchLoginCredentialDetails,
        updateLoginCredential,
        deleteLoginCredential,
    };
});
