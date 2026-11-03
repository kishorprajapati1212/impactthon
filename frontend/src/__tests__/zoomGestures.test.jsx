import React from "react";
import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import useZoomGestures, { dragZoom, pinchZoom, wheelZoom, doubleTapZoom, DRAG_FRACTION } from "../components/Student/useZoomGestures.js";

/**
 * Zoom gestures on the student scanner preview (Phase 18.1): drag up/down,
 * pinch, double-tap, wheel, keyboard. The maths is pure and pinned here; the
 * hook test drives real pointer events through React.
 */

beforeAll(() => {
  if (typeof window.PointerEvent === "undefined") {
    window.PointerEvent = class PointerEvent extends MouseEvent {
      constructor(type, init = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 1;
        this.pointerType = init.pointerType || "touch";
      }
    };
  }
  if (!Element.prototype.setPointerCapture) Element.prototype.setPointerCapture = () => {};
});

describe("zoom gesture maths", () => {
  it("drag: moving the finger up zooms in; 60 % of the preview height spans the whole range", () => {
    expect(dragZoom(1, -0.6 * 400 * DRAG_FRACTION / DRAG_FRACTION, 400, 3)).toBeCloseTo(4, 5); // -240px on a 400px preview, range 3 → 4×
    expect(dragZoom(1, -120, 400, 3)).toBeCloseTo(2.5, 5);
    expect(dragZoom(3, 120, 400, 3)).toBeCloseTo(1.5, 5); // dragging down zooms out
    expect(dragZoom(2, 0, 400, 3)).toBe(2);
  });
  it("pinch: zoom scales with the finger distance ratio", () => {
    expect(pinchZoom(1, 100, 200)).toBe(2);
    expect(pinchZoom(3, 200, 100)).toBe(1.5);
    expect(pinchZoom(2, 0, 50)).toBe(100); // startDist guarded against /0
  });
  it("wheel: up = in, down = out; double-tap toggles 1× ↔ 2×", () => {
    expect(wheelZoom(1, -100)).toBeGreaterThan(1);
    expect(wheelZoom(2, 100)).toBeLessThan(2);
    expect(wheelZoom(2, 0)).toBe(2);
    expect(doubleTapZoom(1)).toBe(2);
    expect(doubleTapZoom(2.4)).toBe(1);
  });
});

function Probe({ enabled = true, start = 1 }) {
  const [zoom, setZoomState] = React.useState({ value: start, min: 1, max: 4 });
  const setZoom = React.useCallback((v) => setZoomState((z) => ({ ...z, value: Math.min(4, Math.max(1, Number(v))) })), []);
  const g = useZoomGestures({ enabled, zoom, setZoom });
  return (
    <div>
      <div ref={g.ref} {...g.handlers} data-testid="preview" tabIndex={0} style={{ height: 400 }} />
      <output data-testid="zoom">{zoom.value.toFixed(2)}</output>
      <output data-testid="used">{String(g.used)}</output>
      <output data-testid="dragging">{String(g.dragging)}</output>
    </div>
  );
}

const pointer = (el, type, { id = 1, x = 0, y = 0 }) => fireEvent(el, new window.PointerEvent(type, { pointerId: id, clientX: x, clientY: y, bubbles: true, button: 0 }));

describe("useZoomGestures (hook)", () => {
  it("one-finger drag up zooms in, drag down zooms out, and a tiny movement is still a tap", () => {
    const { getByTestId } = render(<Probe />);
    const el = getByTestId("preview");
    Object.defineProperty(el, "clientHeight", { configurable: true, value: 400 });
    pointer(el, "pointerdown", { x: 100, y: 300 });
    pointer(el, "pointermove", { x: 100, y: 298 }); // below the tap slop → nothing yet
    expect(getByTestId("zoom").textContent).toBe("1.00");
    expect(getByTestId("dragging").textContent).toBe("false");
    pointer(el, "pointermove", { x: 100, y: 180 }); // 120px up on 400px → +1.5
    expect(getByTestId("zoom").textContent).toBe("2.50");
    expect(getByTestId("dragging").textContent).toBe("true");
    expect(getByTestId("used").textContent).toBe("true");
    pointer(el, "pointermove", { x: 100, y: 240 }); // back down 60px → 1.75
    expect(getByTestId("zoom").textContent).toBe("1.75");
    pointer(el, "pointerup", { x: 100, y: 240 });
    expect(getByTestId("dragging").textContent).toBe("false");
  });

  it("two fingers pinch: distance doubled → zoom doubled; clamped to the range", () => {
    const { getByTestId } = render(<Probe />);
    const el = getByTestId("preview");
    pointer(el, "pointerdown", { id: 1, x: 100, y: 200 });
    pointer(el, "pointerdown", { id: 2, x: 200, y: 200 }); // distance 100
    pointer(el, "pointermove", { id: 2, x: 300, y: 200 }); // distance 200 → 2×
    expect(getByTestId("zoom").textContent).toBe("2.00");
    pointer(el, "pointermove", { id: 2, x: 700, y: 200 }); // 600 → 6× → clamped 4×
    expect(getByTestId("zoom").textContent).toBe("4.00");
    pointer(el, "pointerup", { id: 2, x: 700, y: 200 });
    pointer(el, "pointerup", { id: 1, x: 100, y: 200 });
    expect(getByTestId("dragging").textContent).toBe("false");
  });

  it("double-tap toggles between 1× and 2×", () => {
    const { getByTestId } = render(<Probe />);
    const el = getByTestId("preview");
    pointer(el, "pointerdown", { x: 50, y: 50 });
    pointer(el, "pointerup", { x: 50, y: 50 });
    pointer(el, "pointerdown", { x: 52, y: 51 });
    pointer(el, "pointerup", { x: 52, y: 51 });
    expect(getByTestId("zoom").textContent).toBe("2.00");
    pointer(el, "pointerdown", { x: 50, y: 50 });
    pointer(el, "pointerup", { x: 50, y: 50 });
    pointer(el, "pointerdown", { x: 50, y: 50 });
    pointer(el, "pointerup", { x: 50, y: 50 });
    expect(getByTestId("zoom").textContent).toBe("1.00");
  });

  it("keyboard and wheel zoom too; nothing happens while disabled", () => {
    const { getByTestId, rerender } = render(<Probe />);
    const el = getByTestId("preview");
    fireEvent.keyDown(el, { key: "+" });
    expect(getByTestId("zoom").textContent).toBe("1.50");
    fireEvent.keyDown(el, { key: "ArrowDown" });
    expect(getByTestId("zoom").textContent).toBe("1.00");
    act(() => { el.dispatchEvent(new WheelEvent("wheel", { deltaY: -100, bubbles: true, cancelable: true })); });
    expect(Number(getByTestId("zoom").textContent)).toBeGreaterThan(1);
    rerender(<Probe enabled={false} />);
    const before = getByTestId("zoom").textContent;
    const el2 = getByTestId("preview");
    pointer(el2, "pointerdown", { x: 100, y: 300 });
    pointer(el2, "pointermove", { x: 100, y: 100 });
    fireEvent.keyDown(el2, { key: "+" });
    act(() => { el2.dispatchEvent(new WheelEvent("wheel", { deltaY: -100, bubbles: true, cancelable: true })); });
    expect(getByTestId("zoom").textContent).toBe(before);
  });
});
