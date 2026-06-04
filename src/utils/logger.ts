const LOG_ENABLED = String(import.meta.env.VITE_LOG_ENABLED || '').toLowerCase() === 'true';

function emit(method: 'log' | 'info' | 'warn' | 'error', args: any[]) {
  if (!LOG_ENABLED) {
    return;
  }

  const [prefix, ...content] = args
  const target = console[method] || console.log;
  target(prefix, ...content.map(x => JSON.stringify(x)));
}

export function createLogger(namespace: string) {
  const prefix = `[${namespace}]`;

  return {
    debug: (...args: any[]) => emit('log', [prefix, ...args]),
    error: (...args: any[]) => emit('error', [prefix, ...args]),
    info: (...args: any[]) => emit('info', [prefix, ...args]),
    log: (...args: any[]) => emit('log', [prefix, ...args]),
    warn: (...args: any[]) => emit('warn', [prefix, ...args]),
  };
}

