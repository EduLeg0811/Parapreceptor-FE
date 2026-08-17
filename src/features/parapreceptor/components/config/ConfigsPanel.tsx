import { Braces, PenLine, Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { panelsTopMenuBarBgClass } from "@/styles/backgroundColors";
import SourcesPanel from "@/features/parapreceptor/components/config/SourcesPanel";
import AiConfigsPanel from "@/features/parapreceptor/components/config/AiConfigsPanel";
import GeneralConfigsPanel from "@/features/parapreceptor/components/config/GeneralConfigsPanel";
import type { ConfigPanelTabId, ParameterPanelTarget, SelectOption } from "@/features/parapreceptor/types";
import type { UploadedLlmFile } from "@/features/parapreceptor/services/openai";
import type { ActionSystemPromptId } from "@/features/parapreceptor/config/actionSystemPrompts";
import { BOOK_SOURCE, VECTOR_STORES_SOURCE } from "@/features/parapreceptor/config/options";

interface ConfigsPanelProps {
  activeTab: ConfigPanelTabId;
  onTabChange: (tab: ConfigPanelTabId) => void;
  onClose: () => void;
  parameterPanelTarget: ParameterPanelTarget;
  selectedBookSourceIds: string[];
  selectedChatSourceLabel: string;
  uploadedChatFiles: UploadedLlmFile[];
  isUploadingChatFiles: boolean;
  llmModel: string;
  llmMaxOutputTokens: number;
  llmMaxNumResults: number;
  llmEditorContextMaxChars: number;
  llmVerbosity: string;
  llmEffort: string;
  llmSystemPrompt: string;
  includeEditorContextInLlm: boolean;
  currentFileId: string;
  aiActionsLlmModel: string;
  aiActionsLlmMaxOutputTokens: number;
  aiActionsLlmVerbosity: string;
  aiActionsLlmEffort: string;
  aiActionSystemPrompts: Partial<Record<ActionSystemPromptId, string>>;
  aiActionsSelectedVectorStoreId: string;
  aiActionVectorStoreOptions: SelectOption[];
  biblioExternaLlmModel: string;
  biblioExternaLlmMaxOutputTokens: number;
  biblioExternaLlmVerbosity: string;
  biblioExternaLlmEffort: string;
  biblioExternaLlmSystemPrompt: string;
  isTermsConceptsConscienciografiaEnabled: boolean;
  miniArlindoTextWindow: number;
  maxResultsDocx: number;
  onToggleBookSource: (id: string, checked: boolean) => void;
  onRemoveUploadedChatFile: (fileId: string) => void;
  onLlmModelChange: (value: string) => void;
  onLlmMaxOutputTokensChange: (value: number) => void;
  onLlmMaxNumResultsChange: (value: number) => void;
  onLlmEditorContextMaxCharsChange: (value: number) => void;
  onLlmVerbosityChange: (value: string) => void;
  onLlmEffortChange: (value: string) => void;
  onLlmSystemPromptChange: (value: string) => void;
  onResetAllConfig: () => void;
  onToggleIncludeEditorContextInLlm: () => void;
  onUploadSourceFiles: (files: File[]) => void | Promise<void>;
  onAiActionsLlmModelChange: (value: string) => void;
  onAiActionsLlmMaxOutputTokensChange: (value: number) => void;
  onAiActionsLlmVerbosityChange: (value: string) => void;
  onAiActionsLlmEffortChange: (value: string) => void;
  onAiActionSystemPromptChange: (actionId: ActionSystemPromptId, value: string) => void;
  onAiActionsSelectedVectorStoreIdChange: (value: string) => void;
  onBiblioExternaLlmModelChange: (value: string) => void;
  onBiblioExternaLlmMaxOutputTokensChange: (value: number) => void;
  onBiblioExternaLlmVerbosityChange: (value: string) => void;
  onBiblioExternaLlmEffortChange: (value: string) => void;
  onBiblioExternaLlmSystemPromptChange: (value: string) => void;
  onMiniArlindoTextWindowChange: (value: number) => void;
  onMaxResultsDocxChange: (value: number) => void;
}

const tabButtonClass = (active: boolean) =>
  `inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
    active
      ? "bg-white text-foreground shadow-sm ring-1 ring-border"
      : "text-muted-foreground hover:bg-white/70 hover:text-foreground"
  }`;

const ConfigsPanel = ({
  activeTab,
  onTabChange,
  onClose,
  parameterPanelTarget,
  selectedBookSourceIds,
  selectedChatSourceLabel,
  uploadedChatFiles,
  isUploadingChatFiles,
  llmModel,
  llmMaxOutputTokens,
  llmMaxNumResults,
  llmEditorContextMaxChars,
  llmVerbosity,
  llmEffort,
  llmSystemPrompt,
  includeEditorContextInLlm,
  currentFileId,
  aiActionsLlmModel,
  aiActionsLlmMaxOutputTokens,
  aiActionsLlmVerbosity,
  aiActionsLlmEffort,
  aiActionSystemPrompts,
  aiActionsSelectedVectorStoreId,
  aiActionVectorStoreOptions,
  biblioExternaLlmModel,
  biblioExternaLlmMaxOutputTokens,
  biblioExternaLlmVerbosity,
  biblioExternaLlmEffort,
  biblioExternaLlmSystemPrompt,
  isTermsConceptsConscienciografiaEnabled,
  miniArlindoTextWindow,
  maxResultsDocx,
  onToggleBookSource,
  onRemoveUploadedChatFile,
  onLlmModelChange,
  onLlmMaxOutputTokensChange,
  onLlmMaxNumResultsChange,
  onLlmEditorContextMaxCharsChange,
  onLlmVerbosityChange,
  onLlmEffortChange,
  onLlmSystemPromptChange,
  onResetAllConfig,
  onToggleIncludeEditorContextInLlm,
  onUploadSourceFiles,
  onAiActionsLlmModelChange,
  onAiActionsLlmMaxOutputTokensChange,
  onAiActionsLlmVerbosityChange,
  onAiActionsLlmEffortChange,
  onAiActionSystemPromptChange,
  onAiActionsSelectedVectorStoreIdChange,
  onBiblioExternaLlmModelChange,
  onBiblioExternaLlmMaxOutputTokensChange,
  onBiblioExternaLlmVerbosityChange,
  onBiblioExternaLlmEffortChange,
  onBiblioExternaLlmSystemPromptChange,
  onMiniArlindoTextWindowChange,
  onMaxResultsDocxChange,
}: ConfigsPanelProps) => (
  <div className="flex h-full min-h-0 flex-col overflow-hidden bg-muted/40">
    <div className={`flex items-center justify-between gap-3 border-b border-border ${panelsTopMenuBarBgClass} px-3 py-2.5`}>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-foreground">Configs</h2>
        <p className="text-[11px] text-muted-foreground">Configuração</p>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" className={tabButtonClass(activeTab === "general")} onClick={() => onTabChange("general")}>
          <PenLine className="h-3.5 w-3.5" />
          <span>Geral</span>
        </button>
        <button type="button" className={tabButtonClass(activeTab === "sources")} onClick={() => onTabChange("sources")}>
          <Settings className="h-3.5 w-3.5" />
          <span>Chat</span>
        </button>
        <button type="button" className={tabButtonClass(activeTab === "ia")} onClick={() => onTabChange("ia")}>
          <Braces className="h-3.5 w-3.5" />
          <span>IA</span>
        </button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} title="Fechar configs">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
    <div className="flex min-h-0 flex-1 flex-col">
      {activeTab === "general" ? (
        <GeneralConfigsPanel
          miniArlindoTextWindow={miniArlindoTextWindow}
          maxResultsDocx={maxResultsDocx}
          onMiniArlindoTextWindowChange={onMiniArlindoTextWindowChange}
          onMaxResultsDocxChange={onMaxResultsDocxChange}
          onResetAllConfig={onResetAllConfig}
        />
      ) : activeTab === "sources" ? (
        <SourcesPanel
          onUploadFiles={(files) => void onUploadSourceFiles(files)}
          bookSources={BOOK_SOURCE.map((item) => ({ ...item }))}
          vectorStoreSources={VECTOR_STORES_SOURCE.map((item) => ({ ...item }))}
          selectedBookSourceIds={selectedBookSourceIds}
          onToggleBookSource={onToggleBookSource}
          selectedChatSourceLabel={selectedChatSourceLabel}
          uploadedFiles={uploadedChatFiles}
          onRemoveUploadedFile={onRemoveUploadedChatFile}
          isUploadingFiles={isUploadingChatFiles}
          llmModel={llmModel}
          onLlmModelChange={onLlmModelChange}
          llmMaxOutputTokens={llmMaxOutputTokens}
          onLlmMaxOutputTokensChange={onLlmMaxOutputTokensChange}
          llmMaxNumResults={llmMaxNumResults}
          onLlmMaxNumResultsChange={onLlmMaxNumResultsChange}
          llmEditorContextMaxChars={llmEditorContextMaxChars}
          onLlmEditorContextMaxCharsChange={onLlmEditorContextMaxCharsChange}
          llmVerbosity={llmVerbosity}
          onLlmVerbosityChange={onLlmVerbosityChange}
          llmEffort={llmEffort}
          onLlmEffortChange={onLlmEffortChange}
          llmSystemPrompt={llmSystemPrompt}
          onLlmSystemPromptChange={onLlmSystemPromptChange}
          includeEditorContextInLlm={includeEditorContextInLlm}
          onToggleIncludeEditorContextInLlm={onToggleIncludeEditorContextInLlm}
          canToggleIncludeEditorContextInLlm={Boolean(currentFileId)}
          onResetAllConfig={onResetAllConfig}
        />
      ) : (
        <AiConfigsPanel
          parameterPanelTarget={parameterPanelTarget}
          hasDocumentOpen={Boolean(currentFileId)}
          isTermsConceptsConscienciografiaEnabled={isTermsConceptsConscienciografiaEnabled}
          includeEditorContextInLlm={includeEditorContextInLlm}
          aiActionsLlmModel={aiActionsLlmModel}
          aiActionsLlmMaxOutputTokens={aiActionsLlmMaxOutputTokens}
          aiActionsLlmVerbosity={aiActionsLlmVerbosity}
          aiActionsLlmEffort={aiActionsLlmEffort}
          aiActionSystemPrompts={aiActionSystemPrompts}
          aiActionsSelectedVectorStoreId={aiActionsSelectedVectorStoreId}
          aiActionVectorStoreOptions={aiActionVectorStoreOptions}
          biblioExternaLlmModel={biblioExternaLlmModel}
          biblioExternaLlmMaxOutputTokens={biblioExternaLlmMaxOutputTokens}
          biblioExternaLlmVerbosity={biblioExternaLlmVerbosity}
          biblioExternaLlmEffort={biblioExternaLlmEffort}
          biblioExternaLlmSystemPrompt={biblioExternaLlmSystemPrompt}
          uploadedChatFiles={uploadedChatFiles}
          isUploadingChatFiles={isUploadingChatFiles}
          onAiActionsLlmModelChange={onAiActionsLlmModelChange}
          onAiActionsLlmMaxOutputTokensChange={onAiActionsLlmMaxOutputTokensChange}
          onAiActionsLlmVerbosityChange={onAiActionsLlmVerbosityChange}
          onAiActionsLlmEffortChange={onAiActionsLlmEffortChange}
          onAiActionSystemPromptChange={onAiActionSystemPromptChange}
          onToggleIncludeEditorContextInLlm={onToggleIncludeEditorContextInLlm}
          onAiActionsSelectedVectorStoreIdChange={onAiActionsSelectedVectorStoreIdChange}
          onBiblioExternaLlmModelChange={onBiblioExternaLlmModelChange}
          onBiblioExternaLlmMaxOutputTokensChange={onBiblioExternaLlmMaxOutputTokensChange}
          onBiblioExternaLlmVerbosityChange={onBiblioExternaLlmVerbosityChange}
          onBiblioExternaLlmEffortChange={onBiblioExternaLlmEffortChange}
          onBiblioExternaLlmSystemPromptChange={onBiblioExternaLlmSystemPromptChange}
          onUploadFiles={onUploadSourceFiles}
          onRemoveUploadedFile={onRemoveUploadedChatFile}
          onResetAllConfig={onResetAllConfig}
        />
      )}
    </div>
  </div>
);

export default ConfigsPanel;

