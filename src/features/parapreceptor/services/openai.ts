import { LLM_DEFAULT_SYSTEM_PROMPT } from "@/features/parapreceptor/services/prompts";

export {
  LLM_DEFAULT_SYSTEM_PROMPT,
  CHAT_SYSTEM_PROMPT,
  BIBLIO_EXTERNA_DEFAULT_SYSTEM_PROMPT,
  buildAiCommandPrompt,
  buildAnalogiesPrompt,
  buildAnalogiesConsPrompt,
  buildAntonymsPrompt,
  buildAntonymsConsPrompt,
  buildChatPrompt,
  buildCognatosPrompt,
  buildCognatosConsPrompt,
  buildComparisonsPrompt,
  buildComparisonsConsPrompt,
  buildCounterpointsPrompt,
  buildCounterpointsConsPrompt,
  buildDefinePrompt,
  buildDefineConsPrompt,
  buildDictLookupPrompt,
  buildDictLookupConsPrompt,
  buildEpigraphPrompt,
  buildEpigraphConsPrompt,
  buildEtymologyPrompt,
  buildEtymologyConsPrompt,
  buildExamplesPrompt,
  buildExamplesConsPrompt,
  buildNeoparadigmaPrompt,
  buildNeoparadigmaConsPrompt,
  buildPensataAnalysisPrompt,
  buildRewritePrompt,
  buildRewriteConsPrompt,
  buildSummarizePrompt,
  buildSummarizeConsPrompt,
  buildSynonymsPrompt,
  buildSynonymsConsPrompt,
  buildTranslatePrompt,
  buildTranslateConsPrompt,
  buildVerbeteDefinologiaPrompt,
  buildVerbeteFatologiaPrompt,
  buildVerbeteFraseEnfaticaPrompt,
  buildVerbeteSinonimologiaPrompt,
} from "@/features/parapreceptor/services/prompts";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

import { getApiUrl } from "../api/config";

const apiUrl = (path: string): string => path;

const originalFetch = window.fetch;
const fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  let finalInput = input;
  if (typeof input === "string" && input.startsWith("/api/")) {
    finalInput = await getApiUrl(input);
  }
  return originalFetch(finalInput, init);
};

// ============================================================
// LLM DEFAULTS (CENTRALIZADOS)
// ============================================================
// Modelo padrao global.
export const LLM_DEFAULT_MODEL = "gpt-5.6-terra";
// Parametro GPT-5.x (text.verbosity na Responses API).
export const LLM_DEFAULT_GPT5_VERBOSITY: "low" | "medium" | "high" = "low";
// Parametro GPT-5.x (reasoning.effort na Responses API).
export const LLM_DEFAULT_GPT5_EFFORT: "none" | "low" | "medium" | "high" = "none";
// Vector stores vindos de .env.
export const LLM_VECTOR_STORES = (import.meta.env.VITE_OPENAI_VECTOR_STORES as string | undefined)?.trim() || "";
export const LLM_VECTOR_STORE_LO = (import.meta.env.VITE_OPENAI_VECTOR_STORE_LO as string | undefined)?.trim() || "";
export const LLM_VECTOR_STORE_TRANSLATE_RAG = (import.meta.env.VITE_OPENAI_VECTOR_STORE_TRANSLATE_RAG as string | undefined)?.trim() || "";

// ============================================================
// CHAT DEFAULTS (AJUSTE ESPECIFICO DO CHAT)
// ============================================================
export const CHAT_MODEL = "gpt-5.6-terra";
export const CHAT_GPT5_VERBOSITY: "low" | "medium" | "high" = LLM_DEFAULT_GPT5_VERBOSITY;
export const CHAT_GPT5_EFFORT: "none" | "low" | "medium" | "high" = LLM_DEFAULT_GPT5_EFFORT;
export const CHAT_MAX_OUTPUT_TOKENS: number | undefined = 1000;
export const CHAT_MAX_NUM_RESULTS = 5;

export interface ExecuteLLMParams {
  messages: ChatMessage[];
  previousResponseId?: string;
  model?: string;
  systemPrompt?: string;
  maxOutputTokens?: number;
  verbosity?: "low" | "medium" | "high";
  reasoningEffort?: "none" | "low" | "medium" | "high";
  /** Rótulos ("ALLWV") ou ids "vs_…"; o servidor resolve os rótulos. */
  vectorStores?: string[];
  inputFileIds?: string[];
  vectorMaxResults?: number;
  tools?: Array<Record<string, unknown>>;
}

export interface UploadedLlmFile {
  id: string;
  filename: string;
  bytes: number;
  purpose: string;
  mimeType?: string;
}

export interface ExecuteLLMResult {
  content: string;
  meta?: {
    id?: string;
    model?: string;
    status?: string;
    created_at?: number | string;
    max_output_tokens_requested?: number | null;
    gpt5_verbosity_requested?: string | null;
    gpt5_effort_requested?: string | null;
    usage?: Record<string, unknown>;
    rag_references?: string[];
  };
}

export async function executeLLM(params: ExecuteLLMParams): Promise<ExecuteLLMResult> {
  const vectorStores = params.vectorStores?.map((id) => id.trim()).filter(Boolean);
  const inputFileIds = params.inputFileIds?.map((id) => id.trim()).filter(Boolean);
  const tools = params.tools?.filter(Boolean);
  const body: Record<string, unknown> = {
    model: params.model ?? LLM_DEFAULT_MODEL,
    messages: params.messages,
    previousResponseId: params.previousResponseId,
    systemPrompt: params.systemPrompt ?? LLM_DEFAULT_SYSTEM_PROMPT,
    maxOutputTokens: params.maxOutputTokens,
    verbosity: params.verbosity ?? LLM_DEFAULT_GPT5_VERBOSITY,
    reasoningEffort: params.reasoningEffort ?? LLM_DEFAULT_GPT5_EFFORT,
    vectorMaxResults: params.vectorMaxResults ?? 5,
  };
  if (vectorStores && vectorStores.length > 0) body.vectorStores = vectorStores;
  if (inputFileIds && inputFileIds.length > 0) body.inputFileIds = inputFileIds;
  if (tools && tools.length > 0) body.tools = tools;

  const res = await fetch(apiUrl("/api/llm"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return { content: data.content ?? "", meta: data.meta ?? undefined };
}

export async function uploadLlmSourceFiles(files: File[]): Promise<UploadedLlmFile[]> {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }

  const res = await fetch(apiUrl("/api/llm/files"), {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI file upload error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return Array.isArray(data.files) ? data.files : [];
}
