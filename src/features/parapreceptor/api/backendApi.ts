import type { BiblioWvBookOption, LexicalOverviewHistoryPayload, SemanticOverviewHistoryPayload } from "@/features/parapreceptor/types";

export interface UploadedFileMeta {
  id: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  ext: string;
  createdAt: string;
  convertedFromPdf?: boolean;
  sourceExt?: string;
  sourceStoredName?: string;
  conversionError?: string;
}

import { getApiUrl } from "./config";

const apiUrl = (path: string): string => path;

const originalFetch = window.fetch;
const fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  let finalInput = input;
  if (typeof input === "string" && input.startsWith("/api/")) {
    finalInput = await getApiUrl(input);
  }
  return originalFetch(finalInput, init);
};

const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function safeReadError(res: Response): Promise<string> {
  try {
    const text = (await res.text()).trim();
    if (!text) return `HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(text) as { detail?: string };
      return parsed?.detail || text;
    } catch {
      return text;
    }
  } catch {
    return `HTTP ${res.status}`;
  }
}

async function fetchJsonWithRetry<T>(input: string, init: RequestInit, retries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(input, init);
      if (res.ok) return (await res.json()) as T;

      const message = await safeReadError(res);
      if (attempt < retries && RETRYABLE_STATUS.has(res.status)) {
        await wait(180 * (attempt + 1));
        continue;
      }
      throw new Error(message);
    } catch (err: unknown) {
      lastError = err;
      const isNetworkError =
        err instanceof TypeError ||
        (err instanceof Error && /failed to fetch|networkerror|load failed/i.test(err.message));
      if (attempt < retries && isNetworkError) {
        await wait(180 * (attempt + 1));
        continue;
      }
      break;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Falha de rede ao comunicar com o backend.");
}

function filenameFromContentDisposition(value: string | null, fallback: string): string {
  const header = value || "";
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }
  const plainMatch = header.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1] || fallback;
}

async function fetchBlobWithRetry(input: string, init: RequestInit, fallbackFilename: string, retries = 2): Promise<{ blob: Blob; filename: string }> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(input, init);
      if (res.ok) {
        return {
          blob: await res.blob(),
          filename: filenameFromContentDisposition(res.headers.get("content-disposition"), fallbackFilename),
        };
      }

      const message = await safeReadError(res);
      if (attempt < retries && RETRYABLE_STATUS.has(res.status)) {
        await wait(180 * (attempt + 1));
        continue;
      }
      throw new Error(message);
    } catch (err: unknown) {
      lastError = err;
      const isNetworkError =
        err instanceof TypeError ||
        (err instanceof Error && /failed to fetch|networkerror|load failed/i.test(err.message));
      if (attempt < retries && isNetworkError) {
        await wait(180 * (attempt + 1));
        continue;
      }
      break;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Falha de rede ao comunicar com o backend.");
}

/**
 * O endpoint unificado devolve `{ ok, id, originalName, meta }` com os detalhes
 * aninhados em `meta`, e não expõe `ext`. Como o editor barra o arquivo quando
 * `ext !== "docx"`, a extensão é derivada de `storedName` aqui.
 */
function toUploadedFileMeta(data: Record<string, unknown>): UploadedFileMeta {
  const meta = (data?.meta ?? {}) as Record<string, unknown>;
  const storedName = String(meta.storedName ?? data?.storedName ?? "");
  const ext = storedName.includes(".") ? storedName.split(".").pop()!.toLowerCase() : "";
  return {
    ...(meta as Partial<UploadedFileMeta>),
    id: String(data?.id ?? meta.id ?? ""),
    originalName: String(data?.originalName ?? meta.originalName ?? ""),
    storedName,
    ext,
    convertedFromPdf: Boolean(meta.converted ?? meta.convertedFromPdf),
    sourceStoredName: meta.sourceStoredName ? String(meta.sourceStoredName) : undefined,
  } as UploadedFileMeta;
}

export async function uploadFileToServer(file: File): Promise<UploadedFileMeta> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(apiUrl("/api/files"), { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return toUploadedFileMeta(await res.json());
}

export async function createBlankDocOnServer(title = "novo-documento.docx"): Promise<UploadedFileMeta> {
  const res = await fetch(apiUrl("/api/files/blank"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(await res.text());
  return toUploadedFileMeta(await res.json());
}

export async function fetchFileText(fileId: string): Promise<{ id: string; ext: string; text: string; html?: string; updatedAt: string }> {
  const res = await fetch(apiUrl(`/api/files/${encodeURIComponent(fileId)}/text?t=${Date.now()}`), { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchFileContentBuffer(fileId: string): Promise<ArrayBuffer> {
  const res = await fetch(apiUrl(`/api/files/${encodeURIComponent(fileId)}/content?t=${Date.now()}`), { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.arrayBuffer();
}

export async function saveFileText(fileId: string, payload: { text: string; html?: string }): Promise<{ ok: boolean; id: string; updatedAt: string }> {
  const res = await fetch(apiUrl(`/api/files/${encodeURIComponent(fileId)}/text`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function highlightFileTerm(fileId: string, term: string): Promise<{ ok: boolean; updated: boolean; matches: number; term: string; color: string }> {
  const res = await fetch(apiUrl(`/api/files/${encodeURIComponent(fileId)}/highlight`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ term }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function healthCheck(): Promise<{ ok: boolean; openaiConfigured: boolean }> {
  const res = await fetch(apiUrl("/api/health"));
  if (!res.ok) throw new Error("Backend indisponivel.");
  return res.json();
}

export async function listBiblioWvBooksApp(): Promise<{
  ok: boolean;
  result: {
    books: BiblioWvBookOption[];
  };
}> {
  const data = await fetchJsonWithRetry<any>(apiUrl("/api/biblio/wv/books"), {
    method: "GET",
    cache: "no-store",
  });
  const rawList: Array<{ titulo?: string; sigla?: string }> = data?.books || [];
  const books: BiblioWvBookOption[] = rawList.map((item) => {
    const title = String(item?.titulo || "").trim();
    const sigla = String(item?.sigla || "").trim();
    const id = sigla || title;
    const label = sigla ? `${sigla} - ${title}` : title;
    return { id, label, title, sigla };
  });
  return {
    ok: Boolean(data?.ok ?? true),
    result: { books },
  };
}

export async function insertRefBookMacro(book: string, mode: "bee" | "simples"): Promise<{ ok: boolean; result: string }> {
  const res = await fetch(apiUrl("/api/biblio/wv/reference"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // O endpoint unificado renomeou `mode` para `style`; `book` aceita título ou sigla.
    body: JSON.stringify({ book, style: mode }),
  });
  if (!res.ok) throw new Error(await res.text());
  // A resposta unificada devolve a referência em `text`, não em `result`.
  const data = await res.json();
  return { ok: Boolean(data?.ok ?? true), result: String(data?.text ?? "") };
}

export async function insertRefVerbeteApp(titles: string): Promise<{ ok: boolean; result: { ref_list: string; ref_biblio: string } }> {
  const res = await fetch(apiUrl("/api/biblio/verbetes/reference"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ titles }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function biblioGeralApp(payload: { author?: string; title?: string; year?: string; extra?: string; topK?: number }): Promise<{ ok: boolean; result: { query: { author: string; title: string; year: string; extra: string }; matches: string[]; markdown: string } }> {
  const res = await fetch(apiUrl("/api/biblio/authors/search"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function biblioExternaApp(payload: {
  query?: string;
  author?: string;
  title?: string;
  year?: string;
  journal?: string;
  publisher?: string;
  identifier?: string;
  extra?: string;
  freeText?: string;
  topK?: number;
  llmModel?: string;
  llmMaxOutputTokens?: number;
  llmGpt5Verbosity?: string;
  llmGpt5Effort?: string;
  llmSystemPrompt?: string;
}): Promise<{ ok: boolean; result: { query: string; matches: string[]; markdown: string; score?: { score_percentual?: number; classificacao?: string }; llmLog?: { request?: unknown; response?: unknown } | null; llmLogs?: Array<{ request?: unknown; response?: unknown }> | null } }> {
  const res = await fetch(apiUrl("/api/biblio/external/identify"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function randomPensataApp(): Promise<{ ok: boolean; result: { paragraph: string; page: string; paragraph_number: number; total_paragraphs: number; source: string } }> {
  const res = await fetch(apiUrl("/api/mancia/random"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // Corpo vazio mantém o comportamento antigo: parágrafo aleatório do LO.
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(await res.text());
  // A resposta unificada é plana e usa `text`/`pagina`; o formato antigo era
  // aninhado em `result` com `paragraph`/`page`.
  const data = await res.json();
  return {
    ok: true,
    result: {
      paragraph: String(data?.text ?? ""),
      page: String(data?.pagina ?? ""),
      paragraph_number: Number(data?.paragraph_number ?? 0),
      total_paragraphs: Number(data?.total_paragraphs ?? 0),
      source: String(data?.source ?? "LO"),
    },
  };
}

export async function openVerbetografiaTableApp(payload: { title?: string; specialty?: string }): Promise<UploadedFileMeta> {
  const res = await fetch(apiUrl("/api/local/verbetografia/open-table"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function openVerbetografiaTableWordApp(payload: { title?: string; specialty?: string }): Promise<{
  ok: boolean;
  result: {
    id: string;
    originalName: string;
    storedName: string;
    path: string;
  };
}> {
  const res = await fetch(apiUrl("/api/local/verbetografia/open-table-word"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function listLexicalBooksApp(): Promise<{
  ok: boolean;
  result: {
    books: Array<string | {
      id: string;
      label: string;
      indexId?: string;
      fileStem?: string;
    }>;
  };
}> {
  const data = await fetchJsonWithRetry<any>(apiUrl("/api/lexical/sources"), { method: "GET", cache: "no-store" });
  if (data?.result?.books) return data;
  return {
    ok: Boolean(data?.ok ?? true),
    result: {
      books: data?.sources || data?.books || [],
    },
  };
}

export async function searchLexicalBookApp(payload: {
  book: string;
  term: string;
  limit?: number;
  miniTextWindow?: number;
}): Promise<{
  ok: boolean;
  result: {
    book: string;
    term: string;
    total: number;
    matches: Array<{
      book: string;
      row: number;
      number: number | null;
      title: string;
      text: string;
      pagina: string;
      data: Record<string, string>;
    }>;
  };
}> {
  const data = await fetchJsonWithRetry<any>(apiUrl("/api/lexical/search"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (data?.result) return data;
  return {
    ok: Boolean(data?.ok ?? true),
    result: {
      book: data?.book || payload.book,
      term: data?.term || payload.term,
      total: Number(data?.totalFound ?? data?.total ?? data?.results?.length ?? 0),
      matches: data?.results || data?.matches || [],
    },
  };
}

export async function searchLexicalOverviewApp(payload: {
  term: string;
  limit?: number;
  miniTextWindow?: number;
  sourceIds?: string[];
}): Promise<{
  ok: boolean;
  result: {
    term: string;
    limit: number;
    totalBooks: number;
    totalFound: number;
    groups: Array<{
      bookCode: string;
      bookLabel: string;
      fileStem: string;
      totalFound: number;
      shownCount: number;
      matches: Array<{
        book: string;
        row: number;
        number: number | null;
        title: string;
        text: string;
        pagina: string;
        data: Record<string, string>;
      }>;
    }>;
  };
}> {
  const data = await fetchJsonWithRetry<any>(apiUrl("/api/lexical/overview"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (data?.result) return data;
  return {
    ok: Boolean(data?.ok ?? true),
    result: {
      term: data?.term || payload.term,
      limit: Number(data?.limit ?? payload.limit ?? 50),
      totalBooks: Number(data?.totalBooks ?? data?.groups?.length ?? 0),
      totalFound: Number(data?.totalFound ?? 0),
      groups: data?.groups || [],
    },
  };
}

export async function exportLexicalOverviewDocxApp(payload: {
  term: string;
  limit?: number;
  miniTextWindow?: number;
  maxResultsDocx?: number;
  sourceIds?: string[];
}): Promise<{ blob: Blob; filename: string }> {
  return fetchBlobWithRetry(apiUrl("/api/export/docx/lexical-overview"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  }, "lexical-overview.docx");
}

export async function exportLexicalOverviewDocxFromPayloadApp(payload: LexicalOverviewHistoryPayload & {
  maxResultsDocx?: number;
}): Promise<{ blob: Blob; filename: string }> {
  return fetchBlobWithRetry(apiUrl("/api/export/docx/lexical-overview"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  }, "lexical-overview.docx");
}

export async function lookupLexicalCitationsApp(payload: {
  text: string;
  paginasAntes?: number;
  paginasDepois?: number;
}): Promise<{
  ok: boolean;
  result: {
    paragraphsCount: number;
    total: number;
    results: Array<{
      inputParagraph: string;
      matchedParagraph: string;
      book: string;
      title?: string;
      page: string;
      similarity: number;
      method: string;
      matchedRow?: string | number;
      matchedReference?: string | number;
    }>;
  };
}> {
  const data = await fetchJsonWithRetry<any>(apiUrl("/api/lexical/citations/lookup"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (data?.result) return data;
  return {
    ok: Boolean(data?.ok ?? true),
    result: {
      paragraphsCount: Number(data?.paragraphsCount ?? 0),
      total: Number(data?.total ?? data?.results?.length ?? 0),
      results: data?.results || [],
    },
  };
}

export async function searchVerbeteApp(payload: {
  author?: string;
  title?: string;
  area?: string;
  text?: string;
  limit?: number;
}): Promise<{
  ok: boolean;
  result: {
    query: {
      author: string;
      title: string;
      area: string;
      text: string;
    };
    total: number;
    matches: Array<{
      row: number;
      number: number | null;
      title: string;
      text: string;
      link: string;
      data: Record<string, string>;
    }>;
  };
}> {
  const data = await fetchJsonWithRetry<any>(apiUrl("/api/lexical/verbetes/search"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (data?.result) return data;
  return {
    ok: Boolean(data?.ok ?? true),
    result: {
      query: {
        author: payload.author || "",
        title: payload.title || "",
        area: payload.area || "",
        text: payload.text || "",
      },
      total: Number(data?.totalFound ?? data?.total ?? data?.results?.length ?? 0),
      matches: (data?.results || data?.matches || []).map((row: any) => ({
        ...row,
        link: row.link || row.data?.link || "",
      })),
    },
  };
}

export async function semanticSearchPensatasApp(payload: {
  indexId: string;
  query: string;
  limit?: number;
  minScore?: number | null;
  miniTextWindow?: number;
  useRagContext?: boolean;
  excludeLexicalDuplicates?: boolean;
  vectorStoreIds?: string[];
  ignoreBaseCalibration?: boolean;
}): Promise<{
  ok: boolean;
  result: {
    indexId: string;
    query: string;
    total: number;
    requestedMinScore: number | null;
    recommendedMinScore: number;
    minScore: number;
    ignoreBaseCalibration: boolean;
    lexicalFilteredCount: number;
    ragLlmLog?: {
      request?: unknown;
      response?: unknown;
      error?: string;
    } | null;
    ragContext: {
      usedRagContext: boolean;
      sourceQuery?: string;
      error?: string;
      vectorStoreIds: string[];
      keyTerms: string[];
      definitions: Array<{
        term: string;
        meaning: string;
      }>;
      relatedTerms: string[];
      disambiguatedQuery: string;
      references: string[];
    };
    matches: Array<{
      book: string;
      index_id: string;
      index_label: string;
      row: number;
      text: string;
      metadata: Record<string, unknown>;
      score: number;
      semantic_score?: number;
      alignment_score?: number;
    }>;
  };
}> {
  const data = await fetchJsonWithRetry<any>(apiUrl("/api/semantic/search"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (data?.result) return data;
  return {
    ok: Boolean(data?.ok ?? true),
    result: {
      indexId: data?.indexId || payload.indexId,
      query: data?.term || payload.query,
      total: Number(data?.totalFound ?? data?.total ?? data?.results?.length ?? 0),
      requestedMinScore: payload.minScore ?? null,
      recommendedMinScore: Number(data?.recommendedMinScore ?? 0),
      minScore: Number(data?.minScoreUsed ?? data?.minScore ?? data?.recommendedMinScore ?? 0),
      ignoreBaseCalibration: Boolean(payload.ignoreBaseCalibration),
      lexicalFilteredCount: Number(data?.lexicalFilteredCount ?? 0),
      ragLlmLog: data?.ragLlmLog ?? null,
      ragContext: data?.ragContext ?? {
        usedRagContext: false,
        vectorStoreIds: [],
        keyTerms: [],
        definitions: [],
        relatedTerms: [],
        disambiguatedQuery: "",
        references: [],
      },
      matches: data?.results || data?.matches || [],
    },
  };
}

export async function searchSemanticOverviewApp(payload: {
  term: string;
  limit?: number;
  minScore?: number | null;
  miniTextWindow?: number;
  useRagContext?: boolean;
  excludeLexicalDuplicates?: boolean;
  vectorStoreIds?: string[];
  sourceIds?: string[];
  ignoreBaseCalibration?: boolean;
}): Promise<{
  ok: boolean;
  result: {
    term: string;
    limit: number;
    minScore: number | null;
    recommendedMinScoreMin: number;
    recommendedMinScoreMax: number;
    usesCalibratedMinScores: boolean;
    ignoreBaseCalibration: boolean;
    ragLlmLog?: {
      request?: unknown;
      response?: unknown;
      error?: string;
    } | null;
    ragContext: {
      usedRagContext: boolean;
      sourceQuery?: string;
      error?: string;
      vectorStoreIds: string[];
      keyTerms: string[];
      definitions: Array<{
        term: string;
        meaning: string;
      }>;
      relatedTerms: string[];
      disambiguatedQuery: string;
      references: string[];
    };
    totalIndexes: number;
    totalFound: number;
    lexicalFilteredCount: number;
    groups: Array<{
      indexId: string;
      indexLabel: string;
      totalFound: number;
      shownCount: number;
      matches: Array<{
        book: string;
        index_id: string;
        index_label: string;
        row: number;
        text: string;
        metadata: Record<string, unknown>;
        score: number;
      }>;
    }>;
  };
}> {
  const data = await fetchJsonWithRetry<any>(apiUrl("/api/semantic/overview"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (data?.result) return data;
  return {
    ok: Boolean(data?.ok ?? true),
    result: {
      term: data?.term || payload.term,
      limit: Number(payload.limit ?? 50),
      minScore: payload.minScore ?? null,
      recommendedMinScoreMin: Number(data?.recommendedMinScoreMin ?? 0),
      recommendedMinScoreMax: Number(data?.recommendedMinScoreMax ?? 0),
      usesCalibratedMinScores: true,
      ignoreBaseCalibration: Boolean(payload.ignoreBaseCalibration),
      ragLlmLog: data?.ragLlmLog ?? null,
      ragContext: data?.ragContext ?? {
        usedRagContext: false,
        vectorStoreIds: [],
        keyTerms: [],
        definitions: [],
        relatedTerms: [],
        disambiguatedQuery: "",
        references: [],
      },
      totalIndexes: Number(data?.totalIndexes ?? data?.groups?.length ?? 0),
      totalFound: Number(data?.totalFound ?? 0),
      lexicalFilteredCount: Number(data?.lexicalFilteredCount ?? 0),
      groups: (data?.groups || []).map((g: any) => ({
        ...g,
        matches: g.matches || g.results || [],
      })),
    },
  };
}

export async function exportSemanticOverviewDocxApp(payload: {
  term: string;
  limit?: number;
  minScore?: number | null;
  miniTextWindow?: number;
  useRagContext?: boolean;
  excludeLexicalDuplicates?: boolean;
  vectorStoreIds?: string[];
  sourceIds?: string[];
  ignoreBaseCalibration?: boolean;
  maxResultsDocx?: number;
}): Promise<{ blob: Blob; filename: string }> {
  return fetchBlobWithRetry(apiUrl("/api/export/docx/semantic-overview"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  }, "semantic-overview.docx");
}

export async function exportSemanticOverviewDocxFromPayloadApp(payload: SemanticOverviewHistoryPayload & {
  maxResultsDocx?: number;
}): Promise<{ blob: Blob; filename: string }> {
  return fetchBlobWithRetry(apiUrl("/api/export/docx/semantic-overview"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  }, "semantic-overview.docx");
}

export interface SemanticOverviewProgressEvent {
  at: string;
  stage: string;
  indexId?: string;
  indexLabel?: string;
  position?: number;
  totalIndexes?: number;
  matchesFound?: number;
  totalMatchesAccumulated?: number;
  topScore?: number | null;
  note?: string;
}

export interface SemanticOverviewProgressSnapshot {
  searchType?: "semantic_search" | "semantic_overview" | "lexical_overview";
  status: "idle" | "running" | "completed" | "error";
  startedAt?: string | null;
  finishedAt?: string | null;
  updatedAt?: string | null;
  term?: string;
  limit?: number;
  minScore?: number | null;
  ignoreBaseCalibration?: boolean;
  usesCalibratedMinScores?: boolean;
  totalIndexes?: number;
  processedIndexes?: number;
  currentIndexPosition?: number;
  currentIndexId?: string;
  currentIndexLabel?: string;
  currentMatches?: number;
  totalMatchesAccumulated?: number;
  totalFound?: number;
  lexicalFilteredCount?: number;
  groupsCount?: number;
  topScore?: number | null;
  message?: string;
  error?: string | null;
  ragContext?: {
    usedRagContext: boolean;
    sourceQuery?: string;
    error?: string;
    vectorStoreIds: string[];
    keyTerms: string[];
    definitions: Array<{
      term: string;
      meaning: string;
    }>;
    relatedTerms: string[];
    disambiguatedQuery: string;
    references: string[];
  } | null;
  events: SemanticOverviewProgressEvent[];
}

export async function fetchSemanticSearchProgress(): Promise<{ ok: boolean; result: SemanticOverviewProgressSnapshot }> {
  const data = await fetchJsonWithRetry<any>(apiUrl("/api/progress/semantic-search"), {
    method: "GET",
    cache: "no-store",
  });
  return {
    ok: true,
    result: data?.result || data || { status: "idle", events: [] },
  };
}

export async function fetchSemanticOverviewProgress(): Promise<{ ok: boolean; result: SemanticOverviewProgressSnapshot }> {
  const data = await fetchJsonWithRetry<any>(apiUrl("/api/progress/semantic-overview"), {
    method: "GET",
    cache: "no-store",
  });
  return {
    ok: true,
    result: data?.result || data || { status: "idle", events: [] },
  };
}

export async function fetchLexicalOverviewProgress(): Promise<{ ok: boolean; result: SemanticOverviewProgressSnapshot }> {
  const data = await fetchJsonWithRetry<any>(apiUrl("/api/progress/lexical-overview"), {
    method: "GET",
    cache: "no-store",
  });
  return {
    ok: true,
    result: data?.result || data || { status: "idle", events: [] },
  };
}

export async function searchOnlineDictionaryApp(payload: {
  term: string;
}): Promise<{
  ok: boolean;
  result: {
    term: string;
    sources_total: number;
    sources_ok: number;
    sources_failed: number;
    elapsed_ms: number;
    summary: {
      definitions: string[];
      synonyms: string[];
      examples: string[];
      etymology: string | null;
    };
    results: Array<{
      source: string;
      ok: boolean;
      url: string | null;
      elapsed_ms: number;
      quality_score: number;
      definitions: string[];
      synonyms: string[];
      examples: string[];
      etymology: string | null;
      query_term: string | null;
      retry_without_accents: boolean;
      error: string | null;
    }>;
    request_id: string;
  };
}> {
  return fetchJsonWithRetry(apiUrl("/api/dictionary/online/search"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
}

export async function listSemanticIndexesApp(): Promise<{
  ok: boolean;
  result: {
    indexes: Array<{
      id: string;
      label: string;
      sourceFile: string;
      sourceRows: number;
      model: string;
      dimensions: number;
      embeddingDtype: string;
      suggestedMinScore: number;
    }>;
  };
}> {
  const data = await fetchJsonWithRetry<any>(apiUrl("/api/semantic/indexes"), {
    method: "GET",
    cache: "no-store",
  });
  if (data?.result?.indexes) return data;
  return {
    ok: Boolean(data?.ok ?? true),
    result: {
      indexes: data?.indexes || [],
    },
  };
}
