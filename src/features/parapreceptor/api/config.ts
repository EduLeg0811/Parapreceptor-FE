// TEMPORÁRIO: enquanto o Main-Server não tem deploy próprio, todas as chamadas
// vão para o servidor local. Os fallbacks remotos anteriores apontavam para
// backends desativados (lexicons-server.onrender.com e, via .env,
// parapreceptor-backend.onrender.com). Quando houver URL nova, basta definir
// VITE_API_BASE_URL — ela continua tendo precedência sobre este default.
const MAIN_SERVER_LOCAL = "http://127.0.0.1:8000";

const activeBaseUrl = (() => {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const queryApi = params.get("api");
    if (queryApi) {
      localStorage.setItem("parapreceptor_api_url", queryApi);
      return queryApi;
    }
    const storedApi = localStorage.getItem("parapreceptor_api_url");
    if (storedApi) {
      return storedApi;
    }
  }
  return import.meta.env.VITE_API_BASE_URL || MAIN_SERVER_LOCAL;
})().replace(/\/$/, "");

// Sonda o servidor local só para registrar um aviso claro no console. O
// fallback silencioso para um host remoto foi removido: com o Main-Server
// ainda sem deploy, ele trocaria uma falha visível por um 404 confuso.
const probePromise = (async () => {
  const isLocal =
    activeBaseUrl.includes("localhost") ||
    activeBaseUrl.includes("127.0.0.1") ||
    activeBaseUrl.includes("::1");
  if (!import.meta.env.PROD && isLocal) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600);
      const res = await fetch(`${activeBaseUrl}/api/health`, {
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        console.warn(`[api] Main-Server respondeu ${res.status} em ${activeBaseUrl}/api/health`);
      }
    } catch {
      console.warn(`[api] Main-Server não respondeu em ${activeBaseUrl}. Rode dev.ps1.`);
    }
  }
  return activeBaseUrl;
})();

export async function getApiUrl(path: string): Promise<string> {
  const baseUrl = await probePromise;
  return `${baseUrl}${path}`;
}

export function getActiveBaseUrlSync(): string {
  return activeBaseUrl;
}
