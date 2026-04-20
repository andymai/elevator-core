let toastTimer = 0;

export function toast(toastEl: HTMLElement, msg: string): void {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toastEl.classList.remove("show");
  }, 1600);
}
