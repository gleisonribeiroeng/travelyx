import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="legal-page">
      <a routerLink="/landing" class="back-link">&larr; Voltar</a>
      <h1>Política de Privacidade</h1>
      <p class="updated">Última atualização: 17 de março de 2026</p>

      <section>
        <h2>1. Dados que coletamos</h2>
        <p>Ao usar o Travelyx, coletamos:</p>
        <ul>
          <li><strong>Dados da conta Google:</strong> nome, email e foto de perfil, obtidos via Google OAuth 2.0 no momento do login.</li>
          <li><strong>Dados de viagem:</strong> destinos, datas, voos, hotéis, atividades e itens de roteiro que você cria na plataforma.</li>
          <li><strong>Dados de uso:</strong> páginas visitadas e interações com o sistema para melhorar a experiência.</li>
        </ul>
      </section>

      <section>
        <h2>2. Como usamos seus dados</h2>
        <ul>
          <li>Para autenticar seu acesso via Google OAuth.</li>
          <li>Para salvar e sincronizar suas viagens entre dispositivos.</li>
          <li>Para buscar voos, hotéis e atividades de acordo com seus critérios.</li>
          <li>Para integrar com o Google Calendar, quando autorizado por você.</li>
        </ul>
      </section>

      <section>
        <h2>3. Compartilhamento de dados</h2>
        <p>Não vendemos seus dados pessoais. Compartilhamos informações apenas com:</p>
        <ul>
          <li><strong>APIs de busca</strong> (Booking.com, Priceline, Viator) — apenas dados de busca (destino, datas), sem dados pessoais.</li>
          <li><strong>Google</strong> — para autenticação e integração com Calendar, conforme sua autorização.</li>
          <li><strong>Stripe</strong> — para processamento de pagamentos do plano PRO (apenas dados de cobrança).</li>
        </ul>
      </section>

      <section>
        <h2>4. Armazenamento e segurança</h2>
        <p>Seus dados são armazenados em servidores seguros com criptografia em trânsito (HTTPS/TLS). Senhas não são armazenadas — a autenticação é feita exclusivamente via Google OAuth.</p>
      </section>

      <section>
        <h2>5. Seus direitos</h2>
        <p>Você pode a qualquer momento:</p>
        <ul>
          <li>Solicitar a exclusão da sua conta e todos os dados associados.</li>
          <li>Revogar o acesso do Travelyx à sua conta Google nas configurações do Google.</li>
          <li>Exportar seus dados de viagem.</li>
        </ul>
      </section>

      <section>
        <h2>6. Contato</h2>
        <p>Para questões sobre privacidade, entre em contato: <a href="mailto:contato&#64;travelyx.com.br">contato&#64;travelyx.com.br</a></p>
      </section>
    </div>
  `,
  styles: [`
    .legal-page {
      max-width: 720px;
      margin: 40px auto;
      padding: 24px;
      font-family: var(--triply-font-family, system-ui, sans-serif);
      color: var(--triply-text-primary, #1a1a2e);
      line-height: 1.7;
    }
    .back-link {
      color: var(--triply-primary, #f97316);
      text-decoration: none;
      font-size: 0.9rem;
      &:hover { text-decoration: underline; }
    }
    h1 { font-size: 1.8rem; margin: 16px 0 4px; }
    .updated { color: #666; font-size: 0.85rem; margin-bottom: 32px; }
    h2 { font-size: 1.15rem; margin: 28px 0 8px; color: var(--triply-primary, #f97316); }
    ul { padding-left: 20px; }
    li { margin-bottom: 6px; }
    a { color: var(--triply-primary, #f97316); }
  `],
})
export class PrivacyComponent {}
