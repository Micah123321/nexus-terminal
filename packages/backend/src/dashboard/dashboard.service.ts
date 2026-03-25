import { getDashboardSummary } from './dashboard.repository';
import type { DashboardSummary } from './dashboard.types';
import { clientStates } from '../websocket/state';
import { sshSuspendService } from '../ssh-suspend/ssh-suspend.service';

export class DashboardService {
    async getSummary(userId?: number): Promise<DashboardSummary> {
        const summary = await getDashboardSummary();
        const activeStates = Array.from(clientStates.values()).filter((state) => !state.isSuspendedByService);
        const systemActiveSshSessions = activeStates.length;
        const systemStatusStreams = activeStates.filter((state) => !!state.statusIntervalId).length;
        const currentUserActiveSshSessions = typeof userId === 'number'
            ? activeStates.filter((state) => state.ws.userId === userId).length
            : 0;
        const suspendedMetrics = sshSuspendService.getSessionMetrics(userId);

        return {
            ...summary,
            liveMetrics: {
                currentUser: {
                    activeSshSessions: currentUserActiveSshSessions,
                    suspendedSessions: suspendedMetrics.currentUserSuspendedSessions,
                },
                system: {
                    activeSshSessions: systemActiveSshSessions,
                    suspendedSessions: suspendedMetrics.totalSuspendedSessions,
                    statusStreams: systemStatusStreams,
                },
            },
        };
    }
}
