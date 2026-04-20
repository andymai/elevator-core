import type { StrategyName } from "../../types";
import { STRATEGY_LABELS } from "../strategy-picker";

/** Narrow interface — only the fields the sheet compact display needs. */
export interface SheetCompactUi {
  sheetScenario: HTMLElement;
  sheetStrategy: HTMLElement;
}

export function syncSheetCompact(
  ui: SheetCompactUi,
  scenarioLabel: string,
  strategyA: StrategyName,
): void {
  ui.sheetScenario.textContent = scenarioLabel;
  ui.sheetStrategy.textContent = STRATEGY_LABELS[strategyA];
}
