import { useEffect, useRef, useMemo } from "react";
import { MapPin, Users } from "lucide-react";
import GEOFENCE_DEFAULTS from "../../utils/geofence.js";

let leafletLoadPromise = null;

function loadLeaflet() {
  if (typeof window === "undefined") return Promise.reject();
  if (window.L) return Promise.resolve(window.L);
  if (leafletLoadPromise) return leafletLoadPromise;
  leafletLoadPromise = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-leaflet]')) {
      const lk = document.createElement("link");
      lk.rel = "stylesheet";
      lk.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      lk.setAttribute("data-leaflet", "1");
      document.head.appendChild(lk);
    }
    const s = document.createElement("script");
    s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.onload = () => resolve(window.L);
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return leafletLoadPromise;
}

/** Normalize any student/attendance row into { lat, lon, name, roll, status } */
export function normalizeMapStudents(list = []) {
  const out = [];
  for (const raw of list || []) {
    const loc = raw?.location || raw?.student?.location || null;
    const lat = loc?.latitude ?? loc?.lat ?? raw?.latitude;
    const lon = loc?.longitude ?? loc?.lng ?? loc?.lon ?? raw?.longitude;
    if (lat == null || lon == null) continue;
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon))) continue;

    const name =
      raw?.name ||
      raw?.student?.name ||
      raw?.student?.userId?.name ||
      "Student";
    const roll =
      raw?.rollNumber ||
      raw?.student?.rollNumber ||
      raw?.roll ||
      "";
    const status = raw?.status || "PRESENT";
    out.push({
      lat: Number(lat),
      lon: Number(lon),
      name,
      roll,
      status,
      accuracy: loc?.accuracy ?? raw?.accuracy,
    });
  }
  return out;
}

/**
 * Stable map: init once per classroom center.
 * Student markers update without destroying the map.
 */
export default function AttendanceMap({
  classroom,
  students,
  title = "Attendance Map",
  showAbsent = false,
}) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersLayer = useRef(null);
  const classroomKey = classroom?.latitude
    ? `${Number(classroom.latitude).toFixed(5)},${Number(classroom.longitude).toFixed(5)}`
    : "";

  const points = useMemo(() => {
    let list = normalizeMapStudents(students);
    if (!showAbsent) {
      list = list.filter(
        (p) => p.status === "PRESENT" || p.status === "LATE" || !p.status
      );
    }
    return list;
  }, [students, showAbsent]);

  const studentSig = useMemo(
    () =>
      points
        .map((p) => `${p.lat},${p.lon},${p.name},${p.roll},${p.status}`)
        .sort()
        .join("|"),
    [points]
  );

  // Init map once when classroom available
  useEffect(() => {
    if (!classroomKey || !mapRef.current) return;
    let cancelled = false;

    (async () => {
      const L = await loadLeaflet();
      if (cancelled || !mapRef.current) return;

      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        markersLayer.current = null;
      }

      const lat = Number(classroom.latitude);
      const lon = Number(classroom.longitude);
      const map = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView([lat, lon], 17);
      mapInstance.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OSM",
        maxZoom: 19,
      }).addTo(map);

      // Classroom pin
      L.marker([lat, lon], {
        icon: L.divIcon({
          className: "",
          html: `<div style="
            background:#06b6d4;width:26px;height:26px;border-radius:50%;
            border:3px solid white;box-shadow:0 0 12px rgba(6,182,212,0.85);
            display:flex;align-items:center;justify-content:center;
            font-size:11px;font-weight:800;color:white;font-family:Inter,sans-serif;
          ">C</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        }),
      })
        .addTo(map)
        .bindPopup("<b>Classroom / faculty GPS</b>");

      // Geofence rectangle
      const b = classroom.bounds || GEOFENCE_DEFAULTS;
      const degLat = (m) => m / 111320;
      const degLon = (m, la) => m / (111320 * Math.cos((la * Math.PI) / 180));
      L.rectangle(
        [
          [lat + degLat(b.north || 30), lon - degLon(b.west || 100, lat)],
          [lat - degLat(b.south || 200), lon + degLon(b.east || 100, lat)],
        ],
        {
          color: "#f59e0b",
          weight: 3,
          fillColor: "#f59e0b",
          fillOpacity: 0.08,
          dashArray: "4 2",
        }
      )
        .addTo(map)
        .bindPopup(
          `Geofence N:${b.north || 30}m S:${b.south || 200}m E:${b.east || 100}m W:${b.west || 100}m`
        );

      markersLayer.current = L.layerGroup().addTo(map);
      setTimeout(() => map.invalidateSize(), 100);
      setTimeout(() => map.invalidateSize(), 400);
    })().catch(() => {});

    return () => {
      cancelled = true;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        markersLayer.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classroomKey]);

  // Update student markers (no remount)
  useEffect(() => {
    const map = mapInstance.current;
    const layer = markersLayer.current;
    if (!map || !layer || !window.L) return;

    const L = window.L;
    layer.clearLayers();

    const latlngs = [];
    if (classroom?.latitude != null) {
      latlngs.push([Number(classroom.latitude), Number(classroom.longitude)]);
    }

    points.forEach((p, idx) => {
      const isLate = p.status === "LATE";
      const color = isLate ? "#f59e0b" : "#22c55e";
      const label = (p.name || "S").charAt(0).toUpperCase();
      const marker = L.marker([p.lat, p.lon], {
        icon: L.divIcon({
          className: "",
          html: `<div style="
            background:${color};min-width:22px;height:22px;border-radius:999px;
            border:2px solid white;box-shadow:0 0 8px ${color}99;
            display:flex;align-items:center;justify-content:center;
            font-size:10px;font-weight:800;color:white;font-family:Inter,sans-serif;
            padding:0 5px;
          ">${label}</div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        }),
        title: p.name,
      }).bindPopup(
        `<div style="min-width:140px;font-family:Inter,sans-serif">
          <b>${p.name || "Student"}</b><br/>
          <span style="font-family:monospace;font-size:12px">${p.roll || ""}</span><br/>
          <span style="color:${color};font-weight:700">${p.status || "PRESENT"}</span>
          ${
            p.accuracy != null
              ? `<br/><span style="color:#64748b;font-size:11px">GPS ±${Math.round(p.accuracy)}m</span>`
              : ""
          }
          <br/><span style="color:#94a3b8;font-size:10px">${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}</span>
        </div>`
      );
      marker.addTo(layer);
      latlngs.push([p.lat, p.lon]);
    });

    // Fit bounds to classroom + all present students
    if (latlngs.length > 1) {
      try {
        map.fitBounds(latlngs, { padding: [36, 36], maxZoom: 18 });
      } catch {
        /* ignore */
      }
    }
    setTimeout(() => map.invalidateSize(), 50);
  }, [studentSig, points, classroom]);

  if (!classroom?.latitude) {
    return (
      <div className="glass-card p-6 text-center text-slate-400">
        <MapPin size={32} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm font-medium">No classroom GPS on this session</p>
        <p className="text-xs mt-1 opacity-80">
          Start the next lecture with location allowed in the browser to see the map.
        </p>
      </div>
    );
  }

  const withGps = points.length;
  const totalIn = Array.isArray(students) ? students.length : 0;

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700/50 flex flex-wrap items-center gap-2">
        <MapPin size={16} className="text-cyan-400" />
        <h3 className="font-bold text-slate-900 dark:text-slate-100">{title}</h3>
        <div className="ml-auto flex flex-wrap gap-3 text-xs text-slate-400 items-center">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-400" />
            Classroom
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Present
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500" />
            Late
          </span>
          <span className="inline-flex items-center gap-1 text-slate-500">
            <Users size={12} />
            {withGps} pin{withGps === 1 ? "" : "s"}
            {totalIn > withGps ? ` · ${totalIn - withGps} no GPS` : ""}
          </span>
        </div>
      </div>
      <div ref={mapRef} style={{ height: 340, width: "100%" }} />
      {withGps === 0 && (
        <p className="text-xs text-center text-slate-400 py-2 px-3 border-t border-slate-200 dark:border-slate-700/50">
          No student GPS points yet. Students must allow location when they scan
          (or when you mark them after they scanned with GPS).
        </p>
      )}
    </div>
  );
}
