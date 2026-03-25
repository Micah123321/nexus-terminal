import { Request, Response } from 'express';
import { DashboardService } from './dashboard.service';

const dashboardService = new DashboardService();

export class DashboardController {
    async getSummary(req: Request, res: Response): Promise<void> {
        try {
            const summary = await dashboardService.getSummary(req.session.userId);
            res.status(200).json(summary);
        } catch (error: any) {
            console.error('[DashboardController] 获取仪表盘统计失败:', error);
            res.status(500).json({
                message: '获取仪表盘统计失败',
                error: error.message,
            });
        }
    }
}
