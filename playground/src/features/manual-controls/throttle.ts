/**
 * Tactile vertical throttle component for the operator cockpit.
 *
 * The user drags the thumb up to ascend, down to descend. On
 * pointerup, the thumb springs back to centre and emits a 0
 * velocity — joystick-style, so a forgotten throttle can't run the
 * cab into the top of the shaft. Pointer events are captured so the
 * drag survives leaving the throttle bounds.
 *
 * Keyboard: ArrowUp / ArrowDown nudge by `KEY_NUDGE_M_S`; Space
 * recentres. ARIA `slider` role with valuemin/max/now keeps it
 * usable with assistive tech.
 *
 * The component owns no engine knowledge — it emits `onChange(v)`
 * with a velocity in [-maxSpeed, +maxSpeed]. The cockpit console
 * forwards that to `sim.setTargetVelocity`.
 */

const KEY_NUDGE_M_S = 0.25;

export interface ThrottleOptions {
  /** Velocity bound (m/s). Drag-y normalises into [-maxSpeed, +maxSpeed]. */
  maxSpeed: number;
  /** Fired on every change (drag, key, spring-back). Velocity in m/s. */
  onChange: (velocityMs: number) => void;
}

export interface ThrottleHandle {
  /** Force the thumb back to centre and emit `onChange(0)`. */
  centre(): void;
  /** Update the velocity bound at runtime (e.g. tweak drawer change). */
  setMaxSpeed(maxSpeed: number): void;
  /** Tear down listeners. Caller is responsible for removing the node. */
  dispose(): void;
}

/**
 * Mount the throttle into `host`. `host` must be the
 * `.cockpit-throttle` element from `index.html` so the styled track +
 * thumb children are picked up. Keyboard focus lands on `host`.
 */
export function mountThrottle(host: HTMLElement, opts: ThrottleOptions): ThrottleHandle {
  let maxSpeed = opts.maxSpeed;
  let value = 0;

  const thumb = host.querySelector<HTMLElement>(".cockpit-throttle-thumb");
  if (!thumb) throw new Error("mountThrottle: missing .cockpit-throttle-thumb child");

  const setAria = (): void => {
    host.setAttribute("aria-valuemin", String(-maxSpeed));
    host.setAttribute("aria-valuemax", String(maxSpeed));
    host.setAttribute("aria-valuenow", value.toFixed(2));
  };
  setAria();

  /**
   * Detect axis from host dimensions: when the host is taller than
   * wide we drag vertically (drag-up = positive); when it's wider
   * than tall we drag horizontally (drag-right = positive). Recomputed
   * every layout so a media-query flip (mobile portrait → bottom-bar)
   * smoothly switches axes.
   */
  const isVertical = (): boolean => host.clientHeight >= host.clientWidth;

  /**
   * Apply the current `value` to the thumb transform. The track's
   * usable travel is its own length minus the thumb's length; the
   * thumb sits centred at value=0 and translates ±half that travel
   * at ±maxSpeed. Recomputed every paint so it stays correct across
   * resizes and orientation flips.
   */
  const layoutThumb = (): void => {
    const fraction = maxSpeed === 0 ? 0 : value / maxSpeed;
    if (isVertical()) {
      const travel = Math.max(0, (host.clientHeight - thumb.clientHeight) / 2);
      thumb.style.transform = `translateY(${-fraction * travel}px)`;
    } else {
      const travel = Math.max(0, (host.clientWidth - thumb.clientWidth) / 2);
      thumb.style.transform = `translateX(${fraction * travel}px)`;
    }
  };
  layoutThumb();

  const setValue = (next: number, { spring }: { spring: boolean }): void => {
    const clamped = Math.max(-maxSpeed, Math.min(maxSpeed, next));
    if (clamped === value) {
      // Still toggle the spring class so a release without change
      // re-enables the transition for the next interaction.
      host.classList.toggle("cockpit-throttle--springing", spring);
      return;
    }
    value = clamped;
    host.classList.toggle("cockpit-throttle--springing", spring);
    layoutThumb();
    setAria();
    opts.onChange(value);
  };

  // ─── Pointer drag ───────────────────────────────────────────────
  let dragPointerId: number | null = null;
  let dragStartCoord = 0;
  let dragVerticalAtStart = true;
  let dragStartValue = 0;

  const onPointerDown = (e: PointerEvent): void => {
    if (dragPointerId !== null) return;
    dragPointerId = e.pointerId;
    dragVerticalAtStart = isVertical();
    dragStartCoord = dragVerticalAtStart ? e.clientY : e.clientX;
    dragStartValue = value;
    host.setPointerCapture(e.pointerId);
    host.classList.remove("cockpit-throttle--springing");
    e.preventDefault();
    host.focus();
  };

  const onPointerMove = (e: PointerEvent): void => {
    if (e.pointerId !== dragPointerId) return;
    if (dragVerticalAtStart) {
      const travel = Math.max(1, (host.clientHeight - thumb.clientHeight) / 2);
      const dy = e.clientY - dragStartCoord;
      // Drag down is positive screen-y but should reduce velocity.
      const next = dragStartValue + (-dy / travel) * maxSpeed;
      setValue(next, { spring: false });
    } else {
      const travel = Math.max(1, (host.clientWidth - thumb.clientWidth) / 2);
      const dx = e.clientX - dragStartCoord;
      const next = dragStartValue + (dx / travel) * maxSpeed;
      setValue(next, { spring: false });
    }
  };

  const onPointerUp = (e: PointerEvent): void => {
    if (e.pointerId !== dragPointerId) return;
    dragPointerId = null;
    if (host.hasPointerCapture(e.pointerId)) host.releasePointerCapture(e.pointerId);
    setValue(0, { spring: true });
  };

  // ─── Keyboard ───────────────────────────────────────────────────
  // Up/Right always nudge positive (ascend); Down/Left always nudge
  // negative. Both axes are bound regardless of orientation so the
  // ARIA slider role behaves naturally on desktop (vertical) and
  // mobile portrait (horizontal). Home/End jump to the limits;
  // Space recentres.
  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "ArrowUp" || e.key === "ArrowRight") {
      setValue(value + KEY_NUDGE_M_S, { spring: false });
      e.preventDefault();
    } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
      setValue(value - KEY_NUDGE_M_S, { spring: false });
      e.preventDefault();
    } else if (e.key === "Home") {
      setValue(maxSpeed, { spring: false });
      e.preventDefault();
    } else if (e.key === "End") {
      setValue(-maxSpeed, { spring: false });
      e.preventDefault();
    } else if (e.key === " " || e.key === "Spacebar") {
      setValue(0, { spring: true });
      e.preventDefault();
    }
  };

  host.addEventListener("pointerdown", onPointerDown);
  host.addEventListener("pointermove", onPointerMove);
  host.addEventListener("pointerup", onPointerUp);
  host.addEventListener("pointercancel", onPointerUp);
  host.addEventListener("keydown", onKeyDown);

  return {
    centre: () => {
      setValue(0, { spring: true });
    },
    setMaxSpeed(next) {
      maxSpeed = next;
      // Re-clamp the existing value to the new bound and refresh aria.
      setValue(value, { spring: false });
      layoutThumb();
      setAria();
    },
    dispose() {
      // Tear-down during a live drag would otherwise leave the host
      // holding pointer capture on a detached element and the
      // (about-to-be-replaced) sim with whatever non-zero velocity
      // was last commanded. Release capture and snap to 0 first.
      if (dragPointerId !== null) {
        if (host.hasPointerCapture(dragPointerId)) {
          host.releasePointerCapture(dragPointerId);
        }
        dragPointerId = null;
        setValue(0, { spring: false });
      }
      host.removeEventListener("pointerdown", onPointerDown);
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerup", onPointerUp);
      host.removeEventListener("pointercancel", onPointerUp);
      host.removeEventListener("keydown", onKeyDown);
    },
  };
}
