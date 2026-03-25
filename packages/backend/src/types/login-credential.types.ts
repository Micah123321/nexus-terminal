export interface LoginCredentialBase {
    id: number;
    name: string;
    type: 'SSH' | 'RDP' | 'VNC';
    username: string;
    auth_method: 'password' | 'key';
    ssh_key_id?: number | null;
    notes?: string | null;
    created_at: number;
    updated_at: number;
}

export interface CreateLoginCredentialInput {
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

export interface UpdateLoginCredentialInput {
    name?: string;
    type?: 'SSH' | 'RDP' | 'VNC';
    username?: string;
    auth_method?: 'password' | 'key';
    password?: string;
    private_key?: string;
    passphrase?: string;
    ssh_key_id?: number | null;
    notes?: string | null;
}

export interface FullLoginCredentialData extends LoginCredentialBase {
    encrypted_password?: string | null;
    encrypted_private_key?: string | null;
    encrypted_passphrase?: string | null;
}

export interface DecryptedLoginCredentialDetails extends LoginCredentialBase {
    password?: string;
    privateKey?: string;
    passphrase?: string;
}
