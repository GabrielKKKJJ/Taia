import { Injectable, OnDestroy, signal, computed } from '@angular/core';
import { io, Socket } from 'socket.io-client';

export type Nivel = 'info' | 'sucesso' | 'alerta' | 'erro';

export interface Notificacao {
  id: number;
  titulo: string;
  mensagem: string;
  nivel: Nivel;
  origem: string;
  enviadoEm: string;
}

export interface EventoPresenca {
  tipo: 'entrada' | 'saida';
  clienteId: string;
  online: number;
}

const URL_SERVIDOR = 'http://localhost:3000';

/**
 * Conexão do Angular com o servidor de notificações.
 *
 * O componente não fala com o socket.io-client diretamente: consome os signals
 * daqui. Isso mantém a lógica de conexão num lugar só e deixa o componente
 * livre para se preocupar apenas com a exibição.
 */
@Injectable({ providedIn: 'root' })
export class NotificacoesService implements OnDestroy {
  private socket?: Socket;

  /** Histórico da sessão, mais recente primeiro. */
  readonly notificacoes = signal<Notificacao[]>([]);
  readonly conectado = signal(false);
  readonly online = signal(0);
  readonly presenca = signal<EventoPresenca | null>(null);
  readonly erro = signal<string | null>(null);

  /** Toast: só a mais recente, e apenas enquanto for nova. */
  readonly ultima = computed(() => this.notificacoes()[0] ?? null);

  conectar(): void {
    if (this.socket) return;

    this.socket = io(URL_SERVIDOR, {
      transports: ['websocket', 'polling'],
      reconnectionDelay: 2000,
    });

    this.socket.on('connect', () => {
      this.conectado.set(true);
      this.erro.set(null);
    });

    this.socket.on('disconnect', () => this.conectado.set(false));

    this.socket.on('connect_error', (e: Error) =>
      this.erro.set(`Não foi possível conectar ao servidor: ${e.message}`)
    );

    // Enviado uma vez, logo após conectar: evita começar com a tela vazia
    // quando o servidor já emitiu eventos antes deste cliente entrar.
    this.socket.on('historico', (itens: Notificacao[]) =>
      this.notificacoes.set(Array.isArray(itens) ? itens : [])
    );

    this.socket.on('notificacao', (n: Notificacao) =>
      this.notificacoes.update((lista) => [n, ...lista].slice(0, 100))
    );

    this.socket.on('presenca', (e: EventoPresenca) => {
      this.presenca.set(e);
      this.online.set(e.online);
    });

    this.socket.on('online', (n: number) => this.online.set(n));
  }

  desconectar(): void {
    this.socket?.disconnect();
    this.socket = undefined;
    this.conectado.set(false);
  }

  /** Dispara pelo próprio socket, sem passar pelo REST. */
  publicar(titulo: string, mensagem: string, nivel: Nivel): void {
    this.socket?.emit('publicar', { titulo, mensagem, nivel });
  }

  /** Dispara pelo endpoint REST — é o caminho que o enunciado exige. */
  async publicarViaRest(titulo: string, mensagem: string, nivel: Nivel): Promise<void> {
    const resposta = await fetch(`${URL_SERVIDOR}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo, mensagem, nivel }),
    });
    if (!resposta.ok) {
      const corpo = await resposta.json().catch(() => ({}));
      this.erro.set(corpo.erro || `POST /notify falhou com ${resposta.status}`);
    }
  }

  limparHistorico(): void {
    this.notificacoes.set([]);
  }

  ngOnDestroy(): void {
    this.desconectar();
  }
}
