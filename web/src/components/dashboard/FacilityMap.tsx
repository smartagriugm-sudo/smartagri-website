import { useEffect, useRef, useState } from "react";
import { SITES, STATUS_TONE, ZONES, roomsAtSite, type Site, type Zone } from "../../lib/indoor-dashboard";
import { body, display } from "../../lib/fonts";
import type { Status } from "../../lib/indoor-dashboard";

// A real map of where the facilities stand.
//
// Leaflet is loaded and mounted only in the browser. It reaches for `window`
// as soon as it is imported, so a static import would break the server render;
// the dynamic import inside the effect keeps it off the server entirely and out
// of the initial bundle. Until it mounts the panel shows a plain list, so the
// markup the server sends is valid on its own and hydration stays quiet.
//
// Markers are divIcons built from HTML rather than Leaflet's default image
// pins. That avoids the broken marker-image paths bundlers are famous for, and
// lets a marker carry the site's worst room status as its colour.

/** Worst status among a site's rooms, which is what its marker should show. */
function siteStatus(site: Site, statusOf: (z: Zone) => Status): Status | "offline" {
  const rooms = roomsAtSite(site.id);
  if (rooms.length === 0) return "optimal";
  if (rooms.every((r) => !r.online)) return "offline";
  const live = rooms.filter((r) => r.online).map(statusOf);
  if (live.includes("alert")) return "alert";
  if (live.includes("watch")) return "watch";
  return "optimal";
}

function toneFor(s: Status | "offline") {
  if (s === "offline") return { color: "#9CA3AF", label: "Offline" };
  return { color: STATUS_TONE[s].color, label: STATUS_TONE[s].label };
}

export default function FacilityMap({
  selectedSiteId,
  onSelectSite,
  zoneStatus,
}: {
  selectedSiteId: string | null;
  onSelectSite: (siteId: string | null) => void;
  zoneStatus: (z: Zone) => Status;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};

    (async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !holder.current || mapRef.current) return;

      const map = L.map(holder.current, {
        center: [-7.7, 110.26],
        zoom: 9,
        scrollWheelZoom: false,
        attributionControl: true,
      });
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      const markers = SITES.map((site) => {
        const tone = toneFor(siteStatus(site, zoneStatus));
        const count = roomsAtSite(site.id).length;
        const icon = L.divIcon({
          className: "",
          iconSize: [26, 26],
          iconAnchor: [13, 13],
          html: `<span style="display:flex;align-items:center;justify-content:center;
                   width:26px;height:26px;border-radius:9999px;
                   background:${tone.color};color:#fff;font-size:11px;font-weight:600;
                   border:2px solid #fff;box-shadow:0 2px 6px rgba(8,49,58,.35)">${count}</span>`,
        });
        const m = L.marker([site.lat, site.lng], { icon, title: site.name }).addTo(map);
        m.bindPopup(
          `<strong>${site.name}</strong><br/>${site.city}<br/>${count} room${count === 1 ? "" : "s"} · ${tone.label}`,
        );
        m.on("click", () => onSelectSite(site.id));
        return m;
      });

      // Fit to the sites rather than a hard-coded centre, so adding a site in
      // another province reframes the map instead of leaving it off screen.
      map.fitBounds(
        L.latLngBounds(SITES.map((s) => [s.lat, s.lng] as [number, number])),
        { padding: [40, 40], maxZoom: 11 },
      );

      setReady(true);
      cleanup = () => {
        markers.forEach((m) => m.remove());
        map.remove();
        mapRef.current = null;
      };
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
    // Markers are built once. Status changes every tick and rebuilding the map
    // that often would fight the user's panning, so the marker colour is a
    // snapshot from when the map mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="relative overflow-hidden rounded-xl border border-[#0B6477]/10">
        <div ref={holder} className="h-[280px] xl:h-[340px] w-full bg-[#F3F7F6]" />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#F3F7F6]">
            <span className="text-[12px] text-neutral-400" style={body}>
              Loading map
            </span>
          </div>
        )}
      </div>

      {/* Rendered on the server too, so the panel says something useful before
          Leaflet arrives and for anyone the map does not reach. */}
      <div className="mt-3 flex flex-col gap-1.5">
        {SITES.map((site) => {
          const tone = toneFor(siteStatus(site, zoneStatus));
          const rooms = roomsAtSite(site.id);
          const selected = site.id === selectedSiteId;
          return (
            <button
              key={site.id}
              type="button"
              onClick={() => onSelectSite(selected ? null : site.id)}
              className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors ${
                selected
                  ? "border-[#0B6477]/40 bg-[#F3F7F6]"
                  : "border-[#0B6477]/10 hover:border-[#14919B]/40"
              }`}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: tone.color }}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-neutral-800" style={display}>
                  {site.name}
                </span>
                <span className="block truncate text-[11px] text-neutral-400" style={body}>
                  {site.city} · {rooms.length} room{rooms.length === 1 ? "" : "s"}
                </span>
              </span>
              {selected && (
                <span className="shrink-0 text-[10px] font-medium text-[#0B6477]" style={body}>
                  Filtering
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-[10px] text-neutral-400 leading-relaxed" style={body}>
        Site coordinates are placeholders pending survey. {ZONES.length} rooms across{" "}
        {SITES.length} sites.
      </p>
    </div>
  );
}
