import { Request, Response } from 'express';
import * as LoginCredentialService from './login-credential.service';
import { CreateLoginCredentialInput, UpdateLoginCredentialInput } from './login-credential.service';

export const getLoginCredentials = async (req: Request, res: Response): Promise<void> => {
    try {
        const credentials = await LoginCredentialService.getAllLoginCredentials();
        res.status(200).json(credentials);
    } catch (error: any) {
        console.error('Controller: 获取登录凭证列表失败:', error);
        res.status(500).json({ message: error.message || '获取登录凭证列表时发生内部服务器错误。' });
    }
};

export const createLoginCredential = async (req: Request, res: Response): Promise<void> => {
    try {
        const input: CreateLoginCredentialInput = req.body;
        if (!input.name || !input.type || !input.username) {
            res.status(400).json({ message: '请求体必须包含 name、type 和 username。' });
            return;
        }
        const credential = await LoginCredentialService.createLoginCredential(input);
        res.status(201).json({ message: '登录凭证创建成功。', credential });
    } catch (error: any) {
        console.error('Controller: 创建登录凭证失败:', error);
        if (error.message.includes('必须提供') || error.message.includes('需要提供') || error.message.includes('无效')) {
            res.status(400).json({ message: error.message });
            return;
        }
        res.status(500).json({ message: error.message || '创建登录凭证时发生内部服务器错误。' });
    }
};

export const getDecryptedLoginCredential = async (req: Request, res: Response): Promise<void> => {
    try {
        const credentialId = parseInt(req.params.id, 10);
        if (isNaN(credentialId)) {
            res.status(400).json({ message: '无效的登录凭证 ID。' });
            return;
        }

        const credential = await LoginCredentialService.getDecryptedLoginCredentialById(credentialId);
        if (!credential) {
            res.status(404).json({ message: '登录凭证未找到。' });
            return;
        }

        res.status(200).json(credential);
    } catch (error: any) {
        console.error(`Controller: 获取登录凭证 ${req.params.id} 详情失败:`, error);
        res.status(500).json({ message: error.message || '获取登录凭证详情时发生内部服务器错误。' });
    }
};

export const updateLoginCredential = async (req: Request, res: Response): Promise<void> => {
    try {
        const credentialId = parseInt(req.params.id, 10);
        if (isNaN(credentialId)) {
            res.status(400).json({ message: '无效的登录凭证 ID。' });
            return;
        }

        const input: UpdateLoginCredentialInput = req.body;
        if (Object.keys(input).length === 0) {
            res.status(400).json({ message: '请求体不能为空。' });
            return;
        }

        const credential = await LoginCredentialService.updateLoginCredential(credentialId, input);
        if (!credential) {
            res.status(404).json({ message: '登录凭证未找到。' });
            return;
        }

        res.status(200).json({ message: '登录凭证更新成功。', credential });
    } catch (error: any) {
        console.error(`Controller: 更新登录凭证 ${req.params.id} 失败:`, error);
        if (error.message.includes('必须提供') || error.message.includes('需要提供') || error.message.includes('无效')) {
            res.status(400).json({ message: error.message });
            return;
        }
        res.status(500).json({ message: error.message || '更新登录凭证时发生内部服务器错误。' });
    }
};

export const deleteLoginCredential = async (req: Request, res: Response): Promise<void> => {
    try {
        const credentialId = parseInt(req.params.id, 10);
        if (isNaN(credentialId)) {
            res.status(400).json({ message: '无效的登录凭证 ID。' });
            return;
        }

        const deleted = await LoginCredentialService.deleteLoginCredential(credentialId);
        if (!deleted) {
            res.status(404).json({ message: '登录凭证未找到。' });
            return;
        }

        res.status(200).json({ message: '登录凭证删除成功。' });
    } catch (error: any) {
        console.error(`Controller: 删除登录凭证 ${req.params.id} 失败:`, error);
        res.status(500).json({ message: error.message || '删除登录凭证时发生内部服务器错误。' });
    }
};
