import { format, getISOWeek } from 'date-fns';

import type { ConnectionInfo } from '../stores/connections.store';
import type { LoginCredentialDetails } from '../stores/loginCredentials.store';
import type { SessionState } from '../stores/session/types';

export interface DynamicVariableDefinition {
  key: string;
  insertValue: string;
  example: string;
  group: 'datetime' | 'identity' | 'system';
  labelKey: string;
  descriptionKey: string;
}

export interface QuickCommandTemplateWarning {
  code: 'clipboardUnavailable' | 'passwordUnavailable' | 'unknownDynamicVariable';
  variable: string;
}

export interface ResolveQuickCommandTemplateContext {
  customVariables?: Record<string, string>;
  sessionId?: string | null;
  sessions?: Map<string, SessionState>;
  connections?: ConnectionInfo[];
  fetchLoginCredentialDetails?: (id: number) => Promise<LoginCredentialDetails | null>;
}

export interface ResolveQuickCommandTemplateResult {
  command: string;
  undefinedVariables: string[];
  warnings: QuickCommandTemplateWarning[];
}

const CUSTOM_VARIABLE_PATTERN = /\$\{(?!\{)([^}]+)\}/g;
const DYNAMIC_VARIABLE_PATTERN = /\$\{\{([^{}]+)\}\}/g;
const DEFAULT_DATE_FORMAT = 'yyyy-MM-dd';
const DEFAULT_TIME_FORMAT = 'HH:mm:ss';
const RANDOM_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

export const DYNAMIC_VARIABLE_DEFINITIONS: DynamicVariableDefinition[] = [
  {
    key: 'date',
    insertValue: '${{date}}',
    example: '${{date:YYYYMMDD}}',
    group: 'datetime',
    labelKey: 'quickCommands.form.dynamicVariables.items.date.label',
    descriptionKey: 'quickCommands.form.dynamicVariables.items.date.description',
  },
  {
    key: 'time',
    insertValue: '${{time}}',
    example: '${{time:HHmmss}}',
    group: 'datetime',
    labelKey: 'quickCommands.form.dynamicVariables.items.time.label',
    descriptionKey: 'quickCommands.form.dynamicVariables.items.time.description',
  },
  {
    key: 'timestamp',
    insertValue: '${{timestamp}}',
    example: '${{timestamp}}',
    group: 'datetime',
    labelKey: 'quickCommands.form.dynamicVariables.items.timestamp.label',
    descriptionKey: 'quickCommands.form.dynamicVariables.items.timestamp.description',
  },
  {
    key: 'week',
    insertValue: '${{week}}',
    example: '${{week}}',
    group: 'datetime',
    labelKey: 'quickCommands.form.dynamicVariables.items.week.label',
    descriptionKey: 'quickCommands.form.dynamicVariables.items.week.description',
  },
  {
    key: 'uuid',
    insertValue: '${{uuid}}',
    example: '${{uuid}}',
    group: 'identity',
    labelKey: 'quickCommands.form.dynamicVariables.items.uuid.label',
    descriptionKey: 'quickCommands.form.dynamicVariables.items.uuid.description',
  },
  {
    key: 'random',
    insertValue: '${{random:8}}',
    example: '${{random:8}}',
    group: 'identity',
    labelKey: 'quickCommands.form.dynamicVariables.items.random.label',
    descriptionKey: 'quickCommands.form.dynamicVariables.items.random.description',
  },
  {
    key: 'clipboard',
    insertValue: '${{clipboard}}',
    example: '${{clipboard}}',
    group: 'system',
    labelKey: 'quickCommands.form.dynamicVariables.items.clipboard.label',
    descriptionKey: 'quickCommands.form.dynamicVariables.items.clipboard.description',
  },
  {
    key: 'password',
    insertValue: '${{password}}',
    example: '${{password}}',
    group: 'system',
    labelKey: 'quickCommands.form.dynamicVariables.items.password.label',
    descriptionKey: 'quickCommands.form.dynamicVariables.items.password.description',
  },
];

export async function resolveQuickCommandTemplate(
  template: string,
  context: ResolveQuickCommandTemplateContext = {},
): Promise<ResolveQuickCommandTemplateResult> {
  const customVariables = context.customVariables ?? {};
  const undefinedVariables = new Set<string>();
  const warnings = new Map<string, QuickCommandTemplateWarning>();

  let processedCommand = template.replace(CUSTOM_VARIABLE_PATTERN, (fullMatch, rawVariableName: string) => {
    const variableName = rawVariableName.trim();
    if (Object.prototype.hasOwnProperty.call(customVariables, variableName)) {
      return customVariables[variableName];
    }

    undefinedVariables.add(variableName);
    return fullMatch;
  });

  const dynamicMatches = [...processedCommand.matchAll(DYNAMIC_VARIABLE_PATTERN)];
  const now = new Date();
  let cachedClipboard: string | undefined;
  let clipboardLoaded = false;
  let cachedPassword: string | undefined;
  let passwordLoaded = false;

  for (const match of dynamicMatches) {
    const fullMatch = match[0];
    const expression = match[1]?.trim() ?? '';
    const [rawVariableName, rawArgument = ''] = expression.split(/:(.*)/s, 2);
    const variableName = rawVariableName.trim().toLowerCase();
    const argument = rawArgument.trim();

    let replacement = fullMatch;

    if (variableName === 'date') {
      replacement = safeFormat(now, normalizeDateFormat(argument) || DEFAULT_DATE_FORMAT);
    } else if (variableName === 'time') {
      replacement = safeFormat(now, normalizeDateFormat(argument) || DEFAULT_TIME_FORMAT);
    } else if (variableName === 'timestamp') {
      replacement = String(Math.floor(now.getTime() / 1000));
    } else if (variableName === 'week') {
      replacement = String(getISOWeek(now));
    } else if (variableName === 'uuid') {
      replacement = generateUuid();
    } else if (variableName === 'random') {
      replacement = generateRandomString(parseRandomLength(argument));
    } else if (variableName === 'clipboard') {
      if (!clipboardLoaded) {
        cachedClipboard = await readClipboardText();
        clipboardLoaded = true;
      }

      replacement = cachedClipboard ?? '';
      if (!replacement) {
        warnings.set(`clipboard:${expression}`, {
          code: 'clipboardUnavailable',
          variable: expression,
        });
      }
    } else if (variableName === 'password') {
      if (!passwordLoaded) {
        cachedPassword = await resolveSessionPassword(context);
        passwordLoaded = true;
      }

      replacement = cachedPassword ?? '';
      if (!replacement) {
        warnings.set(`password:${expression}`, {
          code: 'passwordUnavailable',
          variable: expression,
        });
      }
    } else {
      warnings.set(`unknown:${expression}`, {
        code: 'unknownDynamicVariable',
        variable: expression,
      });
    }

    processedCommand = processedCommand.replace(fullMatch, replacement);
  }

  return {
    command: processedCommand,
    undefinedVariables: [...undefinedVariables],
    warnings: [...warnings.values()],
  };
}

function normalizeDateFormat(input: string): string {
  if (!input) {
    return '';
  }

  return input
    .replace(/YYYY/g, 'yyyy')
    .replace(/YY/g, 'yy')
    .replace(/DD/g, 'dd');
}

function safeFormat(date: Date, pattern: string): string {
  try {
    return format(date, pattern);
  } catch {
    return format(date, pattern.includes('H') || pattern.includes('m') || pattern.includes('s') ? DEFAULT_TIME_FORMAT : DEFAULT_DATE_FORMAT);
  }
}

function parseRandomLength(rawLength: string): number {
  const parsedLength = Number.parseInt(rawLength, 10);
  if (Number.isFinite(parsedLength) && parsedLength > 0) {
    return parsedLength;
  }

  return 6;
}

function generateRandomString(length: number): string {
  const result: string[] = [];
  const randomBuffer = new Uint32Array(length);

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(randomBuffer);
    for (let index = 0; index < length; index += 1) {
      result.push(RANDOM_CHARSET[randomBuffer[index] % RANDOM_CHARSET.length]);
    }
    return result.join('');
  }

  for (let index = 0; index < length; index += 1) {
    result.push(RANDOM_CHARSET[Math.floor(Math.random() * RANDOM_CHARSET.length)]);
  }
  return result.join('');
}

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const randomBytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(randomBytes);
  } else {
    for (let index = 0; index < randomBytes.length; index += 1) {
      randomBytes[index] = Math.floor(Math.random() * 256);
    }
  }

  randomBytes[6] = (randomBytes[6] & 0x0f) | 0x40;
  randomBytes[8] = (randomBytes[8] & 0x3f) | 0x80;

  const hex = [...randomBytes].map((value) => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function readClipboardText(): Promise<string | undefined> {
  if (typeof navigator === 'undefined' || !navigator.clipboard || typeof navigator.clipboard.readText !== 'function') {
    return undefined;
  }

  try {
    return await navigator.clipboard.readText();
  } catch {
    return undefined;
  }
}

async function resolveSessionPassword(
  context: ResolveQuickCommandTemplateContext,
): Promise<string | undefined> {
  const { sessionId, sessions, connections, fetchLoginCredentialDetails } = context;
  if (!sessionId || !sessions || !connections) {
    return undefined;
  }

  const session = sessions.get(sessionId);
  if (!session) {
    return undefined;
  }

  const connection = connections.find((item) => String(item.id) === String(session.connectionId)) as
    | (ConnectionInfo & { password?: string })
    | undefined;

  if (!connection) {
    return undefined;
  }

  if (typeof connection.password === 'string' && connection.password.length > 0) {
    return connection.password;
  }

  if (connection.login_credential_id && typeof fetchLoginCredentialDetails === 'function') {
    const credential = await fetchLoginCredentialDetails(connection.login_credential_id);
    if (credential?.password) {
      return credential.password;
    }
  }

  return undefined;
}
