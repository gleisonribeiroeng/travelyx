import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="legal-page">
      <a routerLink="/landing" class="back-link">&larr; Voltar</a>
      <h1>Termos de Uso</h1>
      <p class="updated">Última atualização: 17 de março de 2026</p>

      <section>
        <h2>1. Aceitação</h2>
        <p>Ao acessar e usar o Travelyx, você concorda com estes termos. Se não concordar, não utilize o serviço.</p>
      </section>

      <section>
        <h2>2. O que é o Travelyx</h2>
        <p>O Travelyx é uma plataforma de planejamento de viagens que permite pesquisar voos, hotéis, carros e atividades de diferentes fornecedores, e organizar tudo em um roteiro visual.</p>
        <p><strong>Importante:</strong> O Travelyx não é uma agência de viagens. Não vendemos passagens, reservas ou ingressos. Os resultados de busca são fornecidos por APIs de terceiros (Booking.com, Priceline, Viator) e as reservas são feitas diretamente com esses fornecedores.</p>
      </section>

      <section>
        <h2>3. Conta e autenticação</h2>
        <ul>
          <li>O acesso é feito exclusivamente via Google OAuth. Você é responsável por manter a segurança da sua conta Google.</li>
          <li>Cada pessoa deve ter apenas uma conta.</li>
          <li>Reservamo-nos o direito de suspender contas que violem estes termos.</li>
        </ul>
      </section>

      <section>
        <h2>4. Planos e pagamentos</h2>
        <ul>
          <li>O plano gratuito permite 1 viagem com funcionalidades básicas.</li>
          <li>O plano PRO é uma assinatura mensal processada pelo Stripe.</li>
          <li>Cancelamentos podem ser feitos a qualquer momento pelo painel de assinatura.</li>
          <li>Não há reembolso para períodos parcialmente utilizados.</li>
        </ul>
      </section>

      <section>
        <h2>5. Precisão das informações</h2>
        <p>Preços de voos, hotéis e atividades são obtidos em tempo real de APIs externas. Os valores podem variar entre a consulta e a reserva final. O Travelyx não garante a disponibilidade ou preço exato dos serviços listados.</p>
      </section>

      <section>
        <h2>6. Limitação de responsabilidade</h2>
        <p>O Travelyx é fornecido "como está". Não nos responsabilizamos por:</p>
        <ul>
          <li>Reservas feitas em plataformas de terceiros.</li>
          <li>Indisponibilidade temporária de APIs externas.</li>
          <li>Perda de dados decorrente de falhas técnicas além do nosso controle.</li>
        </ul>
      </section>

      <section>
        <h2>7. Propriedade intelectual</h2>
        <p>O design, código e marca Travelyx são de propriedade exclusiva da plataforma. Os dados de viagem criados por você são de sua propriedade.</p>
      </section>

      <section>
        <h2>8. Contato</h2>
        <p>Para questões sobre estes termos: <a href="mailto:contato&#64;travelyx.com.br">contato&#64;travelyx.com.br</a></p>
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
export class TermsComponent {}
