/**
 * Install a pointer+repeat binding on a stepper button. First press
 * fires immediately; holding past `initialDelay` starts a steady
 * `interval` repeat. We stop on any `pointerup`/`pointerleave`/blur so
 * the repeat can't outlive the press. The original click handler is
 * *not* registered -- this function replaces it.
 */
export function attachHoldToRepeat(btn: HTMLButtonElement, fn: () => void): void {
  const initialDelay = 380;
  const interval = 70;
  let timer = 0;
  let repeat = 0;
  const stop = (): void => {
    if (timer) window.clearTimeout(timer);
    if (repeat) window.clearInterval(repeat);
    timer = 0;
    repeat = 0;
  };
  btn.addEventListener("pointerdown", (ev) => {
    if (btn.disabled) return;
    ev.preventDefault();
    fn();
    timer = window.setTimeout(() => {
      repeat = window.setInterval(() => {
        if (btn.disabled) {
          stop();
          return;
        }
        fn();
      }, interval);
    }, initialDelay);
  });
  btn.addEventListener("pointerup", stop);
  btn.addEventListener("pointerleave", stop);
  btn.addEventListener("pointercancel", stop);
  btn.addEventListener("blur", stop);
  // Keyboard activation (Enter / Space) still fires a normal click;
  // register a click listener so that path works too. Using pointer-
  // based press detection means the click event would otherwise fire
  // a second time after pointerup -- guarded by checking whether the
  // pointer sequence already fired.
  btn.addEventListener("click", (ev) => {
    if (ev.pointerType) return;
    fn();
  });
}
