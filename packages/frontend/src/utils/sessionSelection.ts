import type { ConnectionInfo } from '../stores/connections.store';
import type { SessionState } from '../stores/session/types';

export const getUniqueConnectedSshSessions = (
  sessionMap: Map<string, SessionState>,
  connections: ConnectionInfo[],
): SessionState[] => {
  const selectedSessions: SessionState[] = [];
  const seenConnectionIds = new Set<string>();

  for (const session of sessionMap.values()) {
    if (session.wsManager.connectionStatus.value !== 'connected') {
      continue;
    }

    const connectionInfo = connections.find((connection) => connection.id === Number(session.connectionId));
    if (!connectionInfo || connectionInfo.type !== 'SSH') {
      continue;
    }

    if (seenConnectionIds.has(session.connectionId)) {
      continue;
    }

    seenConnectionIds.add(session.connectionId);
    selectedSessions.push(session);
  }

  return selectedSessions;
};
