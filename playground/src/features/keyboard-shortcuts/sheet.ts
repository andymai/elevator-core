interface ShortcutSheetUiHandles {
  shortcutSheet: HTMLElement;
  shortcutSheetClose: HTMLButtonElement;
  shortcutsBtn: HTMLButtonElement;
}

export function setShortcutSheetOpen(ui: ShortcutSheetUiHandles, open: boolean): void {
  const wasOpen = !ui.shortcutSheet.hidden;
  if (open === wasOpen) return;
  ui.shortcutSheet.hidden = !open;
  // Focus management — the sheet is modal-like but not a real <dialog>,
  // so we shuttle focus manually. Opening moves focus into the sheet
  // (so Escape / Tab land predictably); closing returns focus to the
  // trigger so keyboard flow doesn't snap back to <body>.
  if (open) {
    ui.shortcutSheetClose.focus();
  } else {
    ui.shortcutsBtn.focus();
  }
}
