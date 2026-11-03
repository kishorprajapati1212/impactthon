import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, act, cleanup } from "@testing-library/react";

/**
 * Student scanner camera lifecycle (Phase 18).
 * The bug being pinned: leaving the scan screen must release the camera even
 * when getUserMedia resolves *after* the student has already navigated away.
 */

vi.mock("../utils/qrDecoder.js", () => ({
  createQrDecoder: vi.fn(async () => ({ engine: "jsqr", decode: async () => null })),
}));

import useQrCamera, { splitZoom, hardwareZoomRange, maxZoom, cropForZoom, describeCameraError } from "../components/Student/useQrCamera.js";

function makeTrack(caps = {}) {
  return {
    kind: "video",
    stop: vi.fn(),
    getCapabilities: () => caps,
    getSettings: () => ({ deviceId: "cam-1" }),
    applyConstraints: vi.fn(async () => {}),
  };
}
function makeStream(track) {
  return { getTracks: () => [track], getVideoTracks: () => [track] };
}

let latest;
function Probe({ active = true }) {
  const cam = useQrCamera({ active, onDecode: () => {} });
  latest = cam;
  return <video ref={cam.videoRef} data-testid="video" />;
}

beforeEach(() => {
  latest = null;
  Object.defineProperty(HTMLMediaElement.prototype, "play", { configurable: true, value: vi.fn(async () => {}) });
  Object.defineProperty(HTMLMediaElement.prototype, "pause", { configurable: true, value: vi.fn() });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const flush = () => act(() => new Promise((r) => setTimeout(r, 0)));

describe("useQrCamera — the camera is released when the scan screen is left", () => {
  it("stops a stream that arrives after unmount (navigated away while the camera was still opening)", async () => {
    const track = makeTrack();
    let resolveStream;
    const getUserMedia = vi.fn(() => new Promise((res) => { resolveStream = res; }));
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia, enumerateDevices: async () => [] } });

    const { unmount } = render(<Probe />);
    await flush();
    expect(getUserMedia).toHaveBeenCalledTimes(1);

    unmount(); // student taps another tab before the permission prompt / camera start finished
    await act(async () => { resolveStream(makeStream(track)); });
    await flush();

    expect(track.stop).toHaveBeenCalledTimes(1);
  });

  it("stops the running camera on unmount and when `active` turns false", async () => {
    const track = makeTrack();
    const getUserMedia = vi.fn(async () => makeStream(track));
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia, enumerateDevices: async () => [] } });

    const { rerender, unmount } = render(<Probe active />);
    await flush();
    expect(latest.status).toBe("running");

    rerender(<Probe active={false} />);
    await flush();
    expect(track.stop).toHaveBeenCalled();
    expect(latest.status).toBe("idle");

    const track2 = makeTrack();
    getUserMedia.mockImplementation(async () => makeStream(track2));
    rerender(<Probe active />);
    await flush();
    expect(latest.status).toBe("running");
    unmount();
    expect(track2.stop).toHaveBeenCalledTimes(1);
  });

  it("pauses (releases) the camera while the tab is in the background and resumes when it returns", async () => {
    const track = makeTrack();
    const getUserMedia = vi.fn(async () => makeStream(track));
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia, enumerateDevices: async () => [] } });

    render(<Probe />);
    await flush();
    expect(latest.status).toBe("running");

    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(latest.status).toBe("paused");

    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
    await flush();
    expect(getUserMedia).toHaveBeenCalledTimes(2);
    expect(latest.status).toBe("running");
  });

  it("reports a friendly camera error instead of the raw exception", async () => {
    const err = new Error("denied");
    err.name = "NotAllowedError";
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn(async () => { throw err; }), enumerateDevices: async () => [] } });
    render(<Probe />);
    await flush();
    expect(latest.status).toBe("error");
    expect(describeCameraError(latest.error)).toMatch(/Camera is blocked/);
    expect(describeCameraError({ name: "NotReadableError" })).toMatch(/busy in another app/);
    expect(describeCameraError({ name: "NotFoundError" })).toMatch(/No usable camera/);
  });
});

describe("zoom — always available, hardware first, digital on top", () => {
  it("offers 1×–4× digital zoom when the camera has no zoom at all (iPhones, laptops)", async () => {
    const track = makeTrack({});
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn(async () => makeStream(track)), enumerateDevices: async () => [] } });
    render(<Probe />);
    await flush();
    expect(latest.zoom).toMatchObject({ value: 1, min: 1, max: 4, hardware: null, digital: 1 });
    await act(async () => { await latest.setZoom(2.5); });
    expect(latest.zoom).toMatchObject({ value: 2.5, digital: 2.5 });
    expect(track.applyConstraints).not.toHaveBeenCalledWith(expect.objectContaining({ advanced: [{ zoom: expect.anything() }] }));
  });

  it("sends the hardware part to the camera and keeps the rest digital", async () => {
    const track = makeTrack({ zoom: { min: 1, max: 2, step: 0.1 }, torch: true });
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn(async () => makeStream(track)), enumerateDevices: async () => [] } });
    render(<Probe />);
    await flush();
    expect(latest.zoom.max).toBe(4);
    expect(latest.torch.supported).toBe(true);
    await act(async () => { await latest.setZoom(3); });
    expect(latest.zoom).toMatchObject({ value: 3, hardware: 2, digital: 1.5 });
    expect(track.applyConstraints).toHaveBeenLastCalledWith({ advanced: [{ zoom: 2 }] });
  });

  it("pure helpers: splitZoom / hardwareZoomRange / maxZoom / cropForZoom", () => {
    expect(splitZoom(3, null)).toEqual({ total: 3, hardware: 1, digital: 3 });
    expect(splitZoom(3, { min: 1, max: 8, step: 0.1 })).toEqual({ total: 3, hardware: 3, digital: 1 });
    expect(splitZoom(99, null).total).toBe(4);
    expect(splitZoom(0.2, null).total).toBe(1);
    expect(hardwareZoomRange({ zoom: { min: 0.5, max: 100, step: 0.1 } })).toEqual({ min: 1, max: 8, step: 0.1 });
    expect(hardwareZoomRange({ zoom: { min: 1, max: 1 } })).toBeNull();
    expect(hardwareZoomRange({})).toBeNull();
    expect(maxZoom(null)).toBe(4);
    expect(maxZoom({ min: 1, max: 6 })).toBe(6);
    // 1280×720 frame at 2× digital → the centre 360px square is decoded, not the whole frame
    expect(cropForZoom(1280, 720, 2)).toEqual({ sx: 460, sy: 180, side: 360, size: 640 }); // zoomed → crop is scaled UP for the decoder
    expect(cropForZoom(1920, 1080, 1, 640)).toMatchObject({ side: 1080, size: 640 }); // 1× → scaled down
    expect(cropForZoom(640, 480, 1, 640)).toMatchObject({ side: 480, size: 480 }); // small webcam at 1× → untouched
    expect(cropForZoom(1920, 1080, 4, 640)).toMatchObject({ side: 270, size: 640 });
  });
});
