import { AlertTriangle, CheckCircle2, Clock, FileX2, RotateCcw, XCircle, type LucideIcon } from 'lucide-react'
import type { StatusAtividade } from '@/lib/api'
import { cn } from '@/lib/utils'

const ROTULOS: Record<StatusAtividade, string> = {
  pronto: 'Pronto',
  pendencia: 'Com pendência',
  desatualizado: 'Desatualizado',
  'revisao-desatualizada': 'Revisão desatualizada',
  reprovado: 'Reprovado',
  'aguardando-revisao': 'Aguardando revisão',
  'sem-entrega': 'Sem entrega',
}

const ICONES: Record<StatusAtividade, LucideIcon> = {
  pronto: CheckCircle2,
  pendencia: AlertTriangle,
  desatualizado: RotateCcw,
  'revisao-desatualizada': RotateCcw,
  reprovado: XCircle,
  'aguardando-revisao': Clock,
  'sem-entrega': FileX2,
}

const CLASSES: Record<StatusAtividade, string> = {
  pronto: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/25',
  pendencia: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-inset ring-amber-500/25',
  desatualizado: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-inset ring-amber-500/25',
  'revisao-desatualizada': 'bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-inset ring-amber-500/25',
  reprovado: 'bg-red-500/10 text-red-600 dark:text-red-400 ring-1 ring-inset ring-red-500/25',
  'aguardando-revisao': 'bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-1 ring-inset ring-blue-500/25',
  'sem-entrega': 'bg-muted text-muted-foreground ring-1 ring-inset ring-border',
}

export function StatusBadge({ status, className }: { status: StatusAtividade; className?: string }) {
  const Icone = ICONES[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap',
        CLASSES[status],
        className
      )}
    >
      <Icone className="size-3.5" />
      {ROTULOS[status]}
    </span>
  )
}
