import { Injectable, inject, computed } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AuthService, Plan } from './auth.service';
import { PaywallDialogComponent, PaywallDialogData } from '../../shared/components/paywall-dialog/paywall-dialog.component';

export interface PlanLimits {
  maxTrips: number;           // -1 = unlimited
  maxItineraryItems: number;  // -1 = unlimited
  maxManualPerCategory: number;
  features: {
    budget: boolean;
    documents: boolean;
    checklist: boolean;
    conflictDetails: boolean;
    activeTrip: boolean;
    dragDrop: boolean;
    flexibleDates: boolean;
    multiCity: boolean;
    advancedFilters: boolean;
  };
}

const FEATURE_LABELS: Record<keyof PlanLimits['features'], { name: string; desc: string }> = {
  budget: { name: 'Orçamento', desc: 'Controle seus gastos por categoria e acompanhe pagamentos' },
  documents: { name: 'Documentos', desc: 'Guarde passaportes, vouchers e confirmações em um só lugar' },
  checklist: { name: 'Checklist', desc: 'Organize tudo que precisa com prioridades e prazos' },
  conflictDetails: { name: 'Alertas Detalhados', desc: 'Veja conflitos de horário e sugestões de resolução' },
  activeTrip: { name: 'Viagem Ativa', desc: 'Acompanhe sua viagem em tempo real com próximas atividades' },
  dragDrop: { name: 'Agenda Interativa', desc: 'Reorganize seu roteiro arrastando itens no calendário' },
  flexibleDates: { name: 'Datas Flexíveis', desc: 'Busque voos por mês inteiro para encontrar os melhores preços' },
  multiCity: { name: 'Multi-cidade', desc: 'Monte roteiros com até 6 trechos diferentes' },
  advancedFilters: { name: 'Filtros Avançados', desc: 'Filtre por tipo de veículo, preço máximo e mais' },
};

const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: {
    maxTrips: 1,
    maxItineraryItems: 15,
    maxManualPerCategory: 1,
    features: {
      budget: false,
      documents: false,
      checklist: false,
      conflictDetails: false,
      activeTrip: false,
      dragDrop: false,
      flexibleDates: false,
      multiCity: false,
      advancedFilters: false,
    },
  },
  PRO: {
    maxTrips: -1,
    maxItineraryItems: -1,
    maxManualPerCategory: -1,
    features: {
      budget: true,
      documents: true,
      checklist: true,
      conflictDetails: true,
      activeTrip: true,
      dragDrop: true,
      flexibleDates: true,
      multiCity: true,
      advancedFilters: true,
    },
  },
  BUSINESS: {
    maxTrips: -1,
    maxItineraryItems: -1,
    maxManualPerCategory: -1,
    features: {
      budget: true,
      documents: true,
      checklist: true,
      conflictDetails: true,
      activeTrip: true,
      dragDrop: true,
      flexibleDates: true,
      multiCity: true,
      advancedFilters: true,
    },
  },
};

@Injectable({ providedIn: 'root' })
export class PlanService {
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);

  readonly limits = computed(() => PLAN_LIMITS[this.auth.plan()]);
  readonly isPro = this.auth.isPro;
  readonly plan = this.auth.plan;

  hasFeature(feature: keyof PlanLimits['features']): boolean {
    return this.limits().features[feature];
  }

  canCreateTrip(currentTripCount: number): boolean {
    const max = this.limits().maxTrips;
    return max === -1 || currentTripCount < max;
  }

  canAddItem(currentItemCount: number): boolean {
    const max = this.limits().maxItineraryItems;
    return max === -1 || currentItemCount < max;
  }

  remainingItems(currentItemCount: number): number {
    const max = this.limits().maxItineraryItems;
    if (max === -1) return -1;
    return Math.max(0, max - currentItemCount);
  }

  /**
   * Show the paywall dialog for a specific feature.
   * Returns true if user chose to upgrade.
   */
  showPaywall(feature: keyof PlanLimits['features']): Promise<boolean> {
    const info = FEATURE_LABELS[feature];
    return new Promise(resolve => {
      const ref = this.dialog.open(PaywallDialogComponent, {
        data: {
          feature: info.name,
          description: info.desc,
          requiredPlan: 'Pro',
        } satisfies PaywallDialogData,
        maxWidth: '440px',
        panelClass: 'paywall-panel',
      });
      ref.afterClosed().subscribe(result => resolve(result === 'upgrade'));
    });
  }

  /**
   * Show paywall for a limit (trips or items).
   */
  showLimitPaywall(type: 'trip' | 'item'): Promise<boolean> {
    const data: PaywallDialogData = type === 'trip'
      ? { feature: 'Viagens Ilimitadas', description: 'O plano gratuito permite apenas 1 viagem. Faça upgrade para planejar quantas quiser!', requiredPlan: 'Pro' }
      : { feature: 'Itens Ilimitados', description: 'Seu roteiro está incrível! Desbloqueie itens ilimitados no plano Pro.', requiredPlan: 'Pro' };

    return new Promise(resolve => {
      const ref = this.dialog.open(PaywallDialogComponent, {
        data,
        maxWidth: '440px',
        panelClass: 'paywall-panel',
      });
      ref.afterClosed().subscribe(result => resolve(result === 'upgrade'));
    });
  }
}
