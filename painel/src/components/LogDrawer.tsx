import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { EstadoJob } from '@/lib/useEventStream'

export function LogDrawer({ job, aoFechar }: { job: EstadoJob | null; aoFechar: () => void }) {
  const fimRef = useRef<HTMLDivElement>(null)
  const [minimizado, setMinimizado] = useState(false)

  useEffect(() => {
    if (job) setMinimizado(false)
  }, [job?.titulo])

  useEffect(() => {
    if (!minimizado) fimRef.current?.scrollIntoView({ block: 'end' })
  }, [job?.linhas.length, minimizado])

  if (!job) return null

  const cor = job.rodando ? 'bg-amber-500' : job.codigo === 0 ? 'bg-emerald-500' : 'bg-red-500'

  if (minimizado) {
    return (
      <button
        onClick={() => setMinimizado(false)}
        className="fixed right-5 bottom-5 z-50 flex items-center gap-2.5 rounded-full border bg-card px-4 py-2.5 text-sm font-medium shadow-lg transition hover:shadow-xl"
      >
        {job.rodando ? (
          <Loader2 className="size-3.5 animate-spin text-amber-500" />
        ) : (
          <span className={cn('size-2 rounded-full', cor)} />
        )}
        {job.titulo}
        <ChevronUp className="size-3.5 text-muted-foreground" />
      </button>
    )
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[42vh] flex-col rounded-t-xl border bg-card shadow-2xl sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[560px] sm:rounded-xl">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
          {job.rodando ? (
            <Loader2 className="size-3.5 shrink-0 animate-spin text-amber-500" />
          ) : (
            <span className={cn('size-2 shrink-0 rounded-full', cor)} />
          )}
          <span className="truncate">{job.titulo}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button size="icon" variant="ghost" className="size-7" onClick={() => setMinimizado(true)}>
            <ChevronDown className="size-4" />
          </Button>
          <Button size="icon" variant="ghost" className="size-7" onClick={aoFechar}>
            <X className="size-4" />
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1 bg-[#0b0d12]">
        <pre className="px-4 py-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words text-zinc-300">
          {job.linhas.join('\n')}
          {!job.rodando && `\n\n[processo encerrado, código ${job.codigo}]`}
        </pre>
        <div ref={fimRef} />
      </ScrollArea>
    </div>
  )
}
