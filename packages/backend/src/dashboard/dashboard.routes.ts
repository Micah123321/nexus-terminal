import { Router } from 'express';
import { DashboardController } from './dashboard.controller';
import { isAuthenticated } from '../auth/auth.middleware';

const router = Router();
const dashboardController = new DashboardController();

router.use(isAuthenticated);

router.get('/summary', dashboardController.getSummary);

export default router;
