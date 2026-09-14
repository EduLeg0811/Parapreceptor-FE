import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Loader2, Play, RotateCw, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { primaryActionButtonClass } from "@/styles/buttonStyles";
import { panelsTopMenuBarBgClass } from "@/styles/backgroundColors";
import SourceRadioList from "@/features/parapreceptor/components/common/SourceRadioList";
import type { LexicalBookOption, RefBookMode } from "@/features/parapreceptor/types";

const FALLBACK_REF_BOOK_OPTIONS: LexicalBookOption[] = [{ id: "LO2", label: "LO2" }];

interface InsertRefBookPanelProps {
  title: string;
  description: string;
  bookOptions: LexicalBookOption[];
  selectedRefBook: string;
  refBookMode: RefBookMode;
  refBookPages: string;
  onSelectRefBook: (value: string) => void;
  onRefBookModeChange: (value: RefBookMode) => void;
  onRefBookPagesChange: (value: string) => void;
  onRunInsertRefBook: () => void;
  isRunningInsertRefBook: boolean;
  isLoadingBooks?: boolean;
  onReloadBooks?: () => void;
  onClose?: () => void;
  showPanelChrome?: boolean;
}

const InsertRefBookPanel = ({
  title,
  description,
  bookOptions,
  selectedRefBook,
  refBookMode,
  refBookPages,
  onSelectRefBook,
  onRefBookModeChange,
  onRefBookPagesChange,
  onRunInsertRefBook,
  isRunningInsertRefBook,
  isLoadingBooks = false,
  onReloadBooks,
  onClose,
  showPanelChrome = true,
}: InsertRefBookPanelProps) => {
  const refBookOptions = bookOptions.length > 0 ? bookOptions : (isLoadingBooks ? [] : FALLBACK_REF_BOOK_OPTIONS);
  const content = (
    <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
      <div className="space-y-5">
        {showPanelChrome ? (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        ) : null}

        {showPanelChrome ? <Separator /> : null}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Livro</Label>
            {onReloadBooks ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                onClick={onReloadBooks}
                disabled={isLoadingBooks}
                title="Recarregar livros da Bibliografia"
              >
                <RotateCw className={`h-3 w-3 mr-1 ${isLoadingBooks ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
            ) : null}
          </div>
          <SourceRadioList
            name="insert-ref-book"
            items={refBookOptions.map((option) => ({
              id: option.id,
              label: option.label,
            }))}
            selectedId={selectedRefBook}
            isLoading={isLoadingBooks}
            loadingLabel="Carregando livros da Bibliografia..."
            emptyLabel="Nenhum livro disponível."
            onChange={onSelectRefBook}
          />
          {refBookOptions.length === 0 && !isLoadingBooks && onReloadBooks ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onReloadBooks}
              className="mt-1 h-7 text-xs"
            >
              <RotateCw className="h-3 w-3 mr-1.5" />
              Tentar novamente
            </Button>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Formato</Label>
          <div className="flex gap-2">
            {([
              { value: "bee", label: "BEE" },
              { value: "simples", label: "Simples" },
            ] as const).map((option) => {
              const isActive = refBookMode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onRefBookModeChange(option.value)}
                  className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${isActive
                      ? "border-orange-300 bg-orange-100 text-orange-900 shadow-sm"
                      : "border-orange-200/80 bg-orange-50/55 text-orange-700/20 hover:bg-orange-100/50"
                    }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Paginas (Opcional)</Label>
          <p className="text-xs text-muted-foreground">Separe por virgula ou ponto-e-virgula.</p>
          <Textarea
            className="min-h-10 rounded-md border border-input bg-white px-3 py-1 text-xs leading-1 text-foreground"
            rows={2}
            value={refBookPages}
            onChange={(e) => onRefBookPagesChange(e.target.value)}
            placeholder="Ex.: 10, 12-14; 20"
          />
        </div>

        <div className="grid grid-cols-1 gap-2">
          <Button
            variant="secondary"
            size="sm"
            className={primaryActionButtonClass}
            onClick={onRunInsertRefBook}
            disabled={isRunningInsertRefBook}
          >
            {isRunningInsertRefBook ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-black relative z-10" />
                <span className="relative z-10 text-blue-500">Executando</span>
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4 text-black relative z-10" />
                <span className="relative z-10 text-blue-500">Bibliografia</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  if (!showPanelChrome) return content;

  return (
    <div className="flex h-full flex-col">
      <div className={`flex items-center justify-between border-b border-border ${panelsTopMenuBarBgClass} px-4 py-3`}>
        <h2 className="text-sm font-semibold text-foreground">Parameters</h2>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} title="Fechar Parameters">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      {content}
    </div>
  );
};

export default InsertRefBookPanel;

