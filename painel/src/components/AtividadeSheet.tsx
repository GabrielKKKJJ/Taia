import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { StatusBadge } from '@/components/StatusBadge'
import { AtividadeDetalhe } from '@/components/AtividadeDetalhe'
import type { Atividade } from '@/lib/api'

interface Props {
  atividade: Atividade | null
  aberto: boolean
  ocupado: boolean
  onOpenChange: (aberto: boolean) => void
  aoRegerarAtividade: (a: Atividade) => void
  aoRevisar: (a: Atividade) => void
  aoAtualizar?: () => void
}

export function AtividadeSheet({ atividade, aberto, ocupado, onOpenChange, aoRegerarAtividade, aoRevisar, aoAtualizar }: Props) {
  return (
    <Sheet open={aberto} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 overflow-y-auto p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-2xl">
        {atividade && (
          <>
            <SheetHeader className="gap-2 border-b pb-4">
              <StatusBadge status={atividade.status} className="w-fit" />
              <SheetTitle className="text-left text-lg leading-snug">{atividade.nome}</SheetTitle>
              <SheetDescription className="text-left">{atividade.materia}</SheetDescription>
            </SheetHeader>
            <div className="px-4 py-4">
              <AtividadeDetalhe
                atividade={atividade}
                ocupado={ocupado}
                aoRegerarAtividade={() => aoRegerarAtividade(atividade)}
                aoRevisar={() => aoRevisar(atividade)}
                aoAtualizar={aoAtualizar}
              />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
