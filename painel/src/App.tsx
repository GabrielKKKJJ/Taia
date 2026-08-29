import { useEffect, useState } from 'react'
import { ClipboardList, GraduationCap, Settings } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TopBar } from '@/components/TopBar'
import { AtividadesView } from '@/components/AtividadesView'
import { NotasView } from '@/components/NotasView'
import { ConfiguracoesView } from '@/components/ConfiguracoesView'
import { LogDrawer } from '@/components/LogDrawer'
import { useEventStream } from '@/lib/useEventStream'
import { buscarAtividades, buscarNotas, ehErro, type Atividade, type Notas } from '@/lib/api'

export default function App() {
  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [carregando, setCarregando] = useState(true)
  const { job, rodar, fechar } = useEventStream()

  // As notas tambem sao buscadas aqui, junto com as atividades, em vez de
  // esperar o usuario abrir a aba — assim ja estao prontas quando ele clicar.
  const [notas, setNotas] = useState<Notas | null>(null)
  const [notasErro, setNotasErro] = useState<string | null>(null)
  const [notasCarregando, setNotasCarregando] = useState(true)

  const carregarAtividades = () => {
    setCarregando(true)
    buscarAtividades().then((r) => {
      setAtividades(r.atividades)
      setCarregando(false)
    })
  }

  const carregarNotas = (forcar: boolean) => {
    setNotasCarregando(true)
    setNotasErro(null)
    buscarNotas(forcar).then((r) => {
      if (ehErro(r)) setNotasErro(r.erro)
      else setNotas(r)
      setNotasCarregando(false)
    })
  }

  useEffect(() => {
    carregarAtividades()
    carregarNotas(false)
  }, [])

  const rodarERecarregar = (script: string, args: string[], titulo: string) =>
    rodar(script, args, titulo, carregarAtividades)

  const confirmarERodarAgente = (script: string, args: string[], titulo: string, aviso: string) => {
    if (!window.confirm(aviso)) return
    rodarERecarregar(script, args, titulo)
  }

  return (
    <div className="min-h-svh bg-background text-foreground pb-16">
      <TopBar
        ocupado={!!job?.rodando}
        aoAtualizar={carregarAtividades}
        aoColetar={() => rodarERecarregar('coletar', [], 'Coletando do Canvas')}
        aoResumo={() => rodarERecarregar('resumo', [], 'Gerando resumo da rodada')}
        aoRodarSemana={() => rodarERecarregar('rodada', [], 'Rodando a rodada semanal (/atividades)')}
      />

      <main className="mx-auto max-w-6xl px-6 py-8">
        <Tabs defaultValue="atividades">
          <TabsList className="mb-6">
            <TabsTrigger value="atividades">
              <ClipboardList className="size-4" />
              Atividades
            </TabsTrigger>
            <TabsTrigger value="notas">
              <GraduationCap className="size-4" />
              Notas
            </TabsTrigger>
            <TabsTrigger value="configuracoes">
              <Settings className="size-4" />
              Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="atividades">
            <AtividadesView
              atividades={atividades}
              carregando={carregando}
              ocupado={!!job?.rodando}
              aoRegerarAtividade={(a) => rodarERecarregar('relatorio', [a.pasta], `Atividade — ${a.nome}`)}
              aoRevisar={(a) =>
                confirmarERodarAgente(
                  'revisar',
                  [a.pasta],
                  `Revisando — ${a.nome}`,
                  `Isso dispara o agente (/revisar) sozinho na atividade "${a.nome}": regera o relatório e chama o revisor. Confirmar?`
                )
              }
              aoAtualizar={carregarAtividades}
            />
          </TabsContent>

          <TabsContent value="notas">
            <NotasView
              notas={notas}
              erro={notasErro}
              carregando={notasCarregando}
              aoAtualizar={() => carregarNotas(true)}
            />
          </TabsContent>

          <TabsContent value="configuracoes">
            <ConfiguracoesView />
          </TabsContent>
        </Tabs>
      </main>

      <LogDrawer job={job} aoFechar={fechar} />
    </div>
  )
}
