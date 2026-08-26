import { useCallback, useRef, useState } from 'react'
import { iniciarJob, ehErro } from '@/lib/api'

export interface EstadoJob {
  titulo: string
  linhas: string[]
  rodando: boolean
  codigo: number | null
}

/** Dispara um script/agente pelo /api/rodar e acompanha o log via SSE. */
export function useEventStream() {
  const [job, setJob] = useState<EstadoJob | null>(null)
  const esRef = useRef<EventSource | null>(null)

  const rodar = useCallback(async (script: string, args: string[], titulo: string, aoTerminar?: () => void) => {
    esRef.current?.close()
    setJob({ titulo, linhas: [], rodando: true, codigo: null })

    const resp = await iniciarJob(script, args)
    if (ehErro(resp)) {
      setJob((j) => (j ? { ...j, linhas: [...j.linhas, 'Erro: ' + resp.erro], rodando: false, codigo: 1 } : j))
      return
    }

    const es = new EventSource(`/api/rodar/${resp.id}/eventos`)
    esRef.current = es
    es.onmessage = (ev) => {
      const linha = JSON.parse(ev.data) as string
      setJob((j) => (j ? { ...j, linhas: [...j.linhas, linha] } : j))
    }
    es.addEventListener('fim', (ev: MessageEvent) => {
      const codigo = Number((ev as MessageEvent).data)
      setJob((j) => (j ? { ...j, rodando: false, codigo } : j))
      es.close()
      if (aoTerminar) aoTerminar()
    })
    es.onerror = () => {
      setJob((j) => (j && j.rodando ? { ...j, rodando: false } : j))
      es.close()
    }
  }, [])

  const fechar = useCallback(() => setJob(null), [])

  return { job, rodar, fechar }
}
