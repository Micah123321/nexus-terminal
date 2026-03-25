import { getDashboardSummary } from './dashboard.repository';
import type { DashboardSummary } from './dashboard.types';

export class DashboardService {
    async getSummary(): Promise<DashboardSummary> {
        return getDashboardSummary();
    }
}
