// Harness self-test only.
export async function appState() {
  const host = globalThis.__TAURI__;
  if (!host) throw { code: 'unavailable' };
  return host.core.invoke('app_state', {});
}
