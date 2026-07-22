import { WorkflowEmbed } from "smartagri-ui";

// A self-contained workflow HTML framed in the dark smartagri panel. The
// framed doc is inlined here as a data URL so the preview is offline-safe.
const doc = `<!doctype html><html><body style="margin:0;height:100%;display:flex;align-items:center;justify-content:center;background:#08313A;font-family:Inter,sans-serif;color:#fff">
<div style="text-align:center">
<div style="font-size:13px;letter-spacing:.03em;color:#45DFB1;margin-bottom:10px">Sensor pipeline</div>
<div style="font-size:26px;font-weight:600;letter-spacing:-0.02em">Soil moisture &rarr; irrigation control</div>
<div style="margin-top:8px;color:rgba(255,255,255,.7)">Live field telemetry, updated every 15 minutes</div>
</div></body></html>`;

export function Default() {
  return (
    <WorkflowEmbed
      title="Smart irrigation workflow"
      src={`data:text/html;charset=utf-8,${encodeURIComponent(doc)}`}
      height={420}
    />
  );
}
