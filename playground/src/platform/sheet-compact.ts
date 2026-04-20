/** Narrow interface — only the fields the sheet compact display needs. */
export interface SheetCompactUi {
  sheetScenario: HTMLElement;
  sheetStrategy: HTMLElement;
}

/** Update the mobile bottom-sheet summary line with current scenario and strategy labels. */
export function syncSheetCompact(
  ui: SheetCompactUi,
  scenarioLabel: string,
  strategyLabel: string,
): void {
  ui.sheetScenario.textContent = scenarioLabel;
  ui.sheetStrategy.textContent = strategyLabel;
}
