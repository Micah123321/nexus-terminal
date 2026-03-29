import type { ConnectionInfo } from '../stores/connections.store';

export interface ConnectionSearchResult {
  connection: ConnectionInfo;
  score: number;
}

const normalize = (value: string | null | undefined): string => (value ?? '').trim().toLowerCase();

const getDisplayName = (connection: ConnectionInfo): string => connection.name?.trim() || connection.host;

const getEmptyQuerySortValue = (connection: ConnectionInfo): number => connection.last_connected_at ?? 0;

const getFieldScore = (text: string, query: string): number => {
  if (!text || !query) {
    return 0;
  }

  if (text === query) {
    return 320;
  }

  if (text.startsWith(query)) {
    return 260 - Math.min(text.length - query.length, 40);
  }

  const includeIndex = text.indexOf(query);
  if (includeIndex >= 0) {
    return 220 - Math.min(includeIndex * 6, 90);
  }

  let queryIndex = 0;
  let firstMatchIndex = -1;
  let previousMatchIndex = -1;
  let gapPenalty = 0;

  for (let index = 0; index < text.length && queryIndex < query.length; index += 1) {
    if (text[index] !== query[queryIndex]) {
      continue;
    }

    if (firstMatchIndex === -1) {
      firstMatchIndex = index;
    }

    if (previousMatchIndex >= 0) {
      gapPenalty += index - previousMatchIndex - 1;
    }

    previousMatchIndex = index;
    queryIndex += 1;
  }

  if (queryIndex !== query.length || firstMatchIndex === -1) {
    return 0;
  }

  return Math.max(70, 180 - firstMatchIndex * 4 - gapPenalty * 3);
};

const scoreConnection = (connection: ConnectionInfo, query: string): number => {
  const fields: Array<[string, number]> = [
    [normalize(connection.name), 40],
    [normalize(connection.host), 28],
    [normalize(connection.username), 16],
    [normalize(connection.type), 10],
  ];

  let bestScore = 0;

  for (const [field, weight] of fields) {
    const fieldScore = getFieldScore(field, query);
    if (fieldScore <= 0) {
      continue;
    }

    bestScore = Math.max(bestScore, fieldScore + weight);
  }

  return bestScore;
};

export const searchConnections = (
  connections: ConnectionInfo[],
  rawQuery: string,
  limit = 8,
): ConnectionSearchResult[] => {
  const query = normalize(rawQuery);

  if (!query) {
    return [...connections]
      .sort((left, right) => {
        const recentDiff = getEmptyQuerySortValue(right) - getEmptyQuerySortValue(left);
        if (recentDiff !== 0) {
          return recentDiff;
        }

        return getDisplayName(left).localeCompare(getDisplayName(right));
      })
      .slice(0, limit)
      .map((connection) => ({ connection, score: 0 }));
  }

  return connections
    .map((connection) => ({
      connection,
      score: scoreConnection(connection, query),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      const recentDiff = getEmptyQuerySortValue(right.connection) - getEmptyQuerySortValue(left.connection);
      if (recentDiff !== 0) {
        return recentDiff;
      }

      return getDisplayName(left.connection).localeCompare(getDisplayName(right.connection));
    })
    .slice(0, limit);
};
