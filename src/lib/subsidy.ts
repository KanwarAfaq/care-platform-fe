// 長照 2.0/3.0 補助試算（與 LINE 機器人 api/index.py 使用相同的額度與自付比例）。
// 規則於 2026-07 查證；長照 3.0 分階段上路，數值可能異動，正式核定以 1966 長照專線照顧管理專員評估為準。
export const RULES_LAST_VERIFIED = '2026-07-26';

export const CMS_LEVEL_QUOTA: Record<number, number> = {
  2: 10020, 3: 15460, 4: 18580, 5: 24100, 6: 28070, 7: 32090, 8: 36180,
};

export const INCOME_OPTIONS = [
  { value: 'general', label: '一般戶', rate: 0.16 },
  { value: 'mid_low', label: '中低收入戶', rate: 0.05 },
  { value: 'low', label: '低收入戶', rate: 0 },
] as const;

export interface SubsidyResult {
  monthly_care_cap: number;
  government_subsidy: number;
  user_copay: number;
}

export function calculateSubsidy(cmsLevel: number, incomeStatus: string): SubsidyResult {
  const cap = CMS_LEVEL_QUOTA[cmsLevel] ?? 0;
  const rate = INCOME_OPTIONS.find((o) => o.value === incomeStatus)?.rate ?? 0.16;
  const copay = Math.round(cap * rate);
  return { monthly_care_cap: cap, government_subsidy: cap - copay, user_copay: copay };
}
