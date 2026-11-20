import { useMemo } from 'react';
import {
  buildCashFlowTrendModel,
  type AutoDrawdownRule,
  type CashFlowTrendPoint,
  type CashFlowTrendSummary,
  type LinkedBankAccount,
  type LoanFacility,
  type MonthlyCashflowPoint,
  type WalletAccount,
} from '../domain/treasury';

export interface UseCashFlowDataParams {
  cashflow: MonthlyCashflowPoint[];
  wallets: WalletAccount[];
  linkedBanks: LinkedBankAccount[];
  facilities: LoanFacility[];
  autoDrawdownRule: AutoDrawdownRule;
  horizonMonths: number;
  scheduleAdjustmentUsd: number;
}

export interface UseCashFlowDataResult {
  points: CashFlowTrendPoint[];
  summary: CashFlowTrendSummary;
  horizonLabel: string;
}

export function useCashFlowData({
  cashflow,
  wallets,
  linkedBanks,
  facilities,
  autoDrawdownRule,
  horizonMonths,
  scheduleAdjustmentUsd,
}: UseCashFlowDataParams): UseCashFlowDataResult {
  return useMemo(() => {
    const model = buildCashFlowTrendModel({
      cashflow,
      wallets,
      linkedBanks,
      facilities,
      autoDrawdownRule,
      horizonMonths,
      scheduleAdjustmentUsd,
    });

    const horizonLabel =
      horizonMonths <= 1
        ? 'Next 30 Days'
        : horizonMonths === 6
          ? 'Rolling 6 Months'
          : `Rolling ${horizonMonths} Months`;

    return {
      points: model.points,
      summary: model.summary,
      horizonLabel,
    };
  }, [
    cashflow,
    wallets,
    linkedBanks,
    facilities,
    autoDrawdownRule,
    horizonMonths,
    scheduleAdjustmentUsd,
  ]);
}
