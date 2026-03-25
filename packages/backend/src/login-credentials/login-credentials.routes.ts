import { Router } from 'express';
import { isAuthenticated } from '../auth/auth.middleware';
import {
    getLoginCredentials,
    createLoginCredential,
    getDecryptedLoginCredential,
    updateLoginCredential,
    deleteLoginCredential,
} from './login-credentials.controller';

const router = Router();

router.use(isAuthenticated);

router.get('/', getLoginCredentials);
router.post('/', createLoginCredential);
router.get('/:id/details', getDecryptedLoginCredential);
router.put('/:id', updateLoginCredential);
router.delete('/:id', deleteLoginCredential);

export default router;
