import { useState } from 'react'
import { CloudDownload, FileText, Loader2, Play, RefreshCw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface Props {
  aoAtualizar: () => void
  aoColetar: () => void
  aoRodarSemana: () => void
  aoResumo: () => void
  ocupado: boolean
}

export function TopBar({ aoAtualizar, aoColetar, aoRodarSemana, aoResumo, ocupado }: Props) {
  const [confirmarAberto, setConfirmarAberto] = useState(false)

  return (
    <header className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3 border-b bg-background/80 px-6 py-4 backdrop-blur-md">
      <div className="flex items-center gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="size-4" />
        </div>
        <div>
          <h1 className="text-base leading-none font-semibold">Taia</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Atividades semanais do Canvas</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="ghost" onClick={aoAtualizar} disabled={ocupado}>
          <RefreshCw className="size-3.5" />
          Atualizar
        </Button>
        <Button size="sm" variant="outline" onClick={aoColetar} disabled={ocupado}>
          <CloudDownload className="size-3.5" />
          Coletar do Canvas
        </Button>
        <Button size="sm" variant="outline" onClick={aoResumo} disabled={ocupado}>
          <FileText className="size-3.5" />
          Gerar resumo
        </Button>

        <Dialog open={confirmarAberto} onOpenChange={setConfirmarAberto}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={ocupado}>
              {ocupado ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
              Rodar rodada
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rodar a rodada semanal inteira?</DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-2 text-left">
                  <p>
                    Isso dispara o agente configurado (<code>/atividades</code>) sem mais nenhuma
                    confirmação: ele coleta do Canvas, escreve os relatórios lendo o enunciado de
                    cada atividade, gera o <code>.docx</code>/<code>.pdf</code> e chama o revisor —
                    tudo sozinho, editando arquivos no disco.
                  </p>
                  <p>Pode levar vários minutos. Acompanhe pelo log ao vivo.</p>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmarAberto(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  setConfirmarAberto(false)
                  aoRodarSemana()
                }}
              >
                Rodar mesmo assim
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </header>
  )
}
