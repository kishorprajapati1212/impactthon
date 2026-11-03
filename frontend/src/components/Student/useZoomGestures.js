import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useZoomGestures - phone-camera-style zoom gestures for the scanner preview.
 *
 *   • pinch with two fingers            → zoom in / out (like the camera app)
 *   • drag one finger up / down         → zoom in / out (drag ≈ 60 % of the
 *                                          preview height = the whole range)
 *   • double-tap                        → toggle 1× ↔ 2×
 *   • mouse wheel / trackpad (laptops)  → zoom in / out
 *   • keyboard + − ↑ ↓ (preview focused) → zoom in / out
 *
 * Pointer Events are used so one code path serves touch, pen and mouse. The
 * preview must have `touch-action: none` so the browser does not scroll or
 * pinch-zoom the page while the student zooms the camera; a non-passive
 * native touchmove listener covers iOS Safari, which ignores touch-action for
 * page pinch-zoom.
 */

export const DRAG_FRACTION = 0.6; // dragging this fraction of the preview height spans the zoom range
export const TAP_SLOP_PX = 8;
export const DOUBLE_TAP_MS = 320;
export const WHEEL_FACTOR = 1.12;

/** Zoom after a vertical drag of `dy` pixels (negative = finger moved up = zoom in). Pure. */
export function dragZoom(startZoom, dy, height, range) {
  const h = Math.max(1, height || 1);
  return startZoom + (-dy / (DRAG_FRACTION * h)) * Math.max(0, range || 0);
}

/** Zoom after a pinch whose finger distance went from `startDist` to `dist`. Pure. */
export function pinchZoom(startZoom, startDist, dist) {
  return startZoom * (dist / Math.max(1, startDist));
}

/** Zoom after one wheel event (deltaY < 0 = wheel up = zoom in). Pure. */
export function wheelZoom(zoom, deltaY) {
  if (!deltaY) return zoom;
  return deltaY < 0 ? zoom * WHEEL_FACTOR : zoom / WHEEL_FACTOR;
}

/** Double-tap target: back to 1× when zoomed, otherwise 2×. Pure. */
export function doubleTapZoom(zoom) {
  return zoom > 1.05 ? 1 : 2;
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export default function useZoomGestures({ enabled = true, zoom, setZoom, step = 0.5 }) {
  const pointers = useRef(new Map());
  const gesture = useRef(null); // { type: 'drag' | 'pinch', ... }
  const lastTap = useRef(0);
  const zoomRef = useRef(zoom);
  const [dragging, setDragging] = useState(false);
  const [used, setUsed] = useState(false); // the student has zoomed at least once (hides the hint)
  const elRef = useRef(null);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const apply = useCallback(
    (value) => {
      setUsed(true);
      setZoom(value);
    },
    [setZoom]
  );

  const onPointerDown = useCallback(
    (e) => {
      if (!enabled) return;
      if (e.button != null && e.button > 0) return; // right/middle mouse button
      try {
        e.currentTarget.setPointerCapture?.(e.pointerId);
      } catch {
        /* ignore */
      }
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const pts = [...pointers.current.values()];
      if (pts.length >= 2) {
        gesture.current = { type: "pinch", startDist: dist(pts[0], pts[1]), zoom: zoomRef.current.value };
        setDragging(true);
      } else {
        gesture.current = { type: "drag", x: e.clientX, y: e.clientY, zoom: zoomRef.current.value, moved: false, height: e.currentTarget.clientHeight || 300 };
      }
    },
    [enabled]
  );

  const onPointerMove = useCallback(
    (e) => {
      const g = gesture.current;
      if (!g || !pointers.current.has(e.pointerId)) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const z = zoomRef.current;
      if (g.type === "pinch") {
        const pts = [...pointers.current.values()];
        if (pts.length < 2) return;
        apply(pinchZoom(g.zoom, g.startDist, dist(pts[0], pts[1])));
      } else {
        const dy = e.clientY - g.y;
        const dx = e.clientX - g.x;
        if (!g.moved) {
          if (Math.hypot(dx, dy) < TAP_SLOP_PX) return;
          g.moved = true;
          setDragging(true);
        }
        apply(dragZoom(g.zoom, dy, g.height, z.max - z.min));
      }
    },
    [apply]
  );

  const onPointerUp = useCallback(
    (e) => {
      const g = gesture.current;
      pointers.current.delete(e.pointerId);
      if (g?.type === "drag" && !g.moved) {
        const now = Date.now();
        if (now - lastTap.current < DOUBLE_TAP_MS) {
          lastTap.current = 0;
          apply(doubleTapZoom(zoomRef.current.value));
        } else lastTap.current = now;
      }
      if (pointers.current.size === 0) {
        gesture.current = null;
        setDragging(false);
      } else if (pointers.current.size === 1) {
        // one finger lifted after a pinch → continue as a drag from here
        const [p] = [...pointers.current.values()];
        gesture.current = { type: "drag", x: p.x, y: p.y, zoom: zoomRef.current.value, moved: true, height: e.currentTarget?.clientHeight || 300 };
      }
    },
    [apply]
  );

  const onKeyDown = useCallback(
    (e) => {
      if (!enabled) return;
      if (["+", "=", "ArrowUp", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        apply(zoomRef.current.value + step);
      } else if (["-", "_", "ArrowDown", "ArrowLeft"].includes(e.key)) {
        e.preventDefault();
        apply(zoomRef.current.value - step);
      } else if (e.key === "0" || e.key === "Home") {
        e.preventDefault();
        apply(1);
      }
    },
    [enabled, apply, step]
  );

  // Native, non-passive listeners: React registers wheel/touchmove as passive,
  // so preventDefault there would be ignored and the page would scroll/zoom.
  const ref = useCallback(
    (el) => {
      if (elRef.current?.cleanup) elRef.current.cleanup();
      elRef.current = null;
      if (!el) return;
      const onWheel = (e) => {
        if (!enabled) return;
        e.preventDefault();
        apply(wheelZoom(zoomRef.current.value, e.deltaY));
      };
      const onTouchMove = (e) => {
        if (e.touches && e.touches.length > 1) e.preventDefault();
      };
      const onGesture = (e) => e.preventDefault(); // Safari page pinch
      el.addEventListener("wheel", onWheel, { passive: false });
      el.addEventListener("touchmove", onTouchMove, { passive: false });
      el.addEventListener("gesturestart", onGesture);
      el.addEventListener("gesturechange", onGesture);
      elRef.current = {
        el,
        cleanup: () => {
          el.removeEventListener("wheel", onWheel);
          el.removeEventListener("touchmove", onTouchMove);
          el.removeEventListener("gesturestart", onGesture);
          el.removeEventListener("gesturechange", onGesture);
        },
      };
    },
    [enabled, apply]
  );
  useEffect(() => () => elRef.current?.cleanup?.(), []);

  return {
    ref,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onKeyDown },
    dragging,
    used,
  };
}
