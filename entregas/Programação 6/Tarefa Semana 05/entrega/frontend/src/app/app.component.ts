import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificacoesService, Nivel } from './notificacoes.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  readonly svc = inject(NotificacoesService);

  titulo = 'Servidor';
  mensagem = '';
  nivel: Nivel = 'info';

  /** Toast visível por alguns segundos após cada notificação. */
  readonly toastVisivel = signal(false);
  private ultimoIdMostrado = 0;

  ngOnInit(): void {
    this.svc.conectar();

    // Mostra o toast só quando chega uma notificação nova, e não quando o
    // histórico inicial preenche a lista de uma vez.
    setInterval(() => {
      const ultima = this.svc.ultima();
      if (ultima && ultima.id !== this.ultimoIdMostrado) {
        this.ultimoIdMostrado = ultima.id;
        this.toastVisivel.set(true);
        setTimeout(() => this.toastVisivel.set(false), 4000);
      }
    }, 300);
  }

  async enviarViaRest(): Promise<void> {
    if (!this.mensagem.trim()) return;
    await this.svc.publicarViaRest(this.titulo, this.mensagem, this.nivel);
    this.mensagem = '';
  }

  enviarViaSocket(): void {
    if (!this.mensagem.trim()) return;
    this.svc.publicar(this.titulo, this.mensagem, this.nivel);
    this.mensagem = '';
  }

  hora(iso: string): string {
    return new Date(iso).toLocaleTimeString('pt-BR');
  }
}
