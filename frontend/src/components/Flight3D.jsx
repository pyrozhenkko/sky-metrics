import { useEffect, useRef } from 'react';
import { RotateCcw } from 'lucide-react';
import { computeSpeeds } from '../utils/mathUtils';
import { SPEED_CS, MONO } from '../utils/constants';

function sceneAspectRatio(xArr, yArr, zArr, minFrac = 0.28) {
  const span = (arr) => Math.max(1e-9, Math.max(...arr) - Math.min(...arr));
  const dx = span(xArr);
  const dy = span(yArr);
  const dz = span(zArr);
  const dMax = Math.max(dx, dy, dz);
  return {
    x: Math.max(dx / dMax, minFrac),
    y: Math.max(dy / dMax, minFrac),
    z: Math.max(dz / dMax, minFrac),
  };
}

export default function Flight3D({ trajectory, plotlyReady, playbackIndex }) {
  const divRef = useRef();
  const hasPlotted = useRef(false);
  const restyleRafRef = useRef(null);
  const restyleTargetRef = useRef({ i: 0, trajectory: null });
  const isInteractingRef = useRef(false);

  const scheduleRestyle = () => {
    if (restyleRafRef.current != null) return;
    restyleRafRef.current = requestAnimationFrame(() => {
      restyleRafRef.current = null;
      if (
        !hasPlotted.current ||
        !window.Plotly ||
        !divRef.current ||
        isInteractingRef.current
      ) {
        return;
      }
      const { i: j, trajectory: tr } = restyleTargetRef.current;
      if (!tr) return;
      const t = tr.time;
      const xe = tr.x_east;
      const yn = tr.y_north;
      const zu = tr.z_up;
      const speeds = computeSpeeds(tr);
      const tip = t.slice(0, j + 1).map(
        (tv, idx) =>
          `<b>t:</b> ${tv}s<br><b>E:</b> ${xe[idx].toFixed(1)}m &nbsp;<b>N:</b> ${yn[idx].toFixed(1)}m<br><b>Alt:</b> ${zu[idx].toFixed(1)}m<br><b>Speed:</b> ${speeds[idx].toFixed(2)} m/s`
      );

      window.Plotly.restyle(
        divRef.current,
        {
          x: [xe.slice(0, j + 1)],
          y: [yn.slice(0, j + 1)],
          z: [zu.slice(0, j + 1)],
          text: [tip],
          "line.color": [speeds.slice(0, j + 1)],
        },
        [0],
      );

      window.Plotly.restyle(
        divRef.current,
        {
          x: [[xe[j]]],
          y: [[yn[j]]],
          z: [[zu[j]]],
          hovertemplate: [`Playback · t:${t[j]}s · Alt:${zu[j].toFixed(1)}m<extra></extra>`],
        },
        [4],
      );
    });
  };

  useEffect(() => {
    if (!trajectory || !plotlyReady || !window.Plotly) return;
    const { time, x_east, y_north, z_up } = trajectory;
    const speeds = computeSpeeds(trajectory);
    const maxSp = Math.max(...speeds, 1);
    const MF = "DM Mono, monospace";

    const tipText = time.map((t, i) =>
      `<b>t:</b> ${t}s<br><b>E:</b> ${x_east[i].toFixed(1)}m &nbsp;<b>N:</b> ${y_north[i].toFixed(1)}m<br><b>Alt:</b> ${z_up[i].toFixed(1)}m<br><b>Speed:</b> ${speeds[i].toFixed(2)} m/s`
    );

    const axBase = {
      gridcolor: "rgba(255,255,255,0.05)",
      zerolinecolor: "rgba(255,255,255,0.1)",
      tickfont: { color: "#cbd5e1", size: 9, family: MF },
      showbackground: true,
      backgroundcolor: "rgba(10,15,26,0.42)",
    };

    const playIdx0 = 0;
    const ar = sceneAspectRatio(x_east, y_north, z_up);

    window.Plotly.react(divRef.current, [
      {
        type: "scatter3d", mode: "lines",
        x: [x_east[0]], y: [y_north[0]], z: [z_up[0]],
        text: [tipText[0]], hovertemplate: "%{text}<extra></extra>",
        line: { color: [speeds[0]], colorscale: SPEED_CS, width: 6, cmin: 0, cmax: maxSp },
      },
      {
        type: "scatter3d", mode: "markers",
        x: x_east, y: y_north, z: z_up,
        text: tipText, hovertemplate: "%{text}<extra></extra>",
        marker: { size: 2.5, color: speeds, colorscale: SPEED_CS, cmin: 0, cmax: maxSp, opacity: 0.14 },
      },
      {
        type: "scatter3d", mode: "markers+text",
        x: [x_east[0]], y: [y_north[0]], z: [z_up[0]],
        text: ["▲ START"], textposition: "top center",
        textfont: { color: "#22c55e", size: 10, family: MF },
        marker: { size: 8, color: "#22c55e" },
        hovertemplate: "START · Alt: %{z:.1f}m<extra></extra>",
      },
      {
        type: "scatter3d", mode: "markers+text",
        x: [x_east.at(-1)], y: [y_north.at(-1)], z: [z_up.at(-1)],
        text: ["▼ END"], textposition: "top center",
        textfont: { color: "#f87171", size: 10, family: MF },
        marker: { size: 8, color: "#f87171" },
        hovertemplate: "END · Alt: %{z:.1f}m<extra></extra>",
      },
      {
        type: "scatter3d", mode: "markers",
        x: [x_east[playIdx0]], y: [y_north[playIdx0]], z: [z_up[playIdx0]],
        marker: { size: 10, color: "#facc15", symbol: "circle", opacity: 1, line: { color: "#fff", width: 1.5 } },
        hovertemplate: `Playback · t:${time[playIdx0]}s · Alt:${z_up[playIdx0].toFixed(1)}m<extra></extra>`,
      },
    ], {
      uirevision: "flight3d-camera",
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      margin: { l: 0, r: 20, t: 0, b: 0 },
      showlegend: false,
      scene: {
        bgcolor: "rgba(0,0,0,0)",
        dragmode: "orbit",
        xaxis: { ...axBase, title: { text: "East (m)", font: { color: "#cbd5e1", size: 10, family: MF } } },
        yaxis: { ...axBase, title: { text: "North (m)", font: { color: "#cbd5e1", size: 10, family: MF } } },
        zaxis: { ...axBase, title: { text: "Alt (m)", font: { color: "#cbd5e1", size: 10, family: MF } } },
        camera: { eye: { x: 1.45, y: -1.55, z: 0.72 }, up: { x: 0, y: 0, z: 1 } },
        aspectmode: "manual",
        aspectratio: ar,
      },
      coloraxis: {
        colorscale: SPEED_CS, cmin: 0, cmax: maxSp,
        colorbar: {
          title: { text: "Speed (m/s)", font: { color: "#cbd5e1", size: 9, family: MF }, side: "right" },
          tickfont: { color: "#cbd5e1", size: 8, family: MF },
          len: 0.55, thickness: 8,
          bgcolor: "rgba(0,0,0,0)", bordercolor: "rgba(255,255,255,0.06)", x: 1.0,
        },
      },
    }, {
      displayModeBar: true,
      displaylogo: false,
      modeBarButtonsToRemove: ["toImage", "sendDataToCloud"],
      responsive: true,
      staticPlot: false,
      scrollZoom: true,
    });

    hasPlotted.current = true;
    restyleTargetRef.current = { i: 0, trajectory };

    const handlePointerDown = () => {
      isInteractingRef.current = true;
    };

    const handlePointerUp = () => {
      isInteractingRef.current = false;
      scheduleRestyle();
    };

    divRef.current.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointerup", handlePointerUp);
    scheduleRestyle();

    return () => {
      divRef.current?.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [trajectory, plotlyReady]);

  useEffect(() => {
    if (!trajectory) return;
    const last = z_up.length - 1;
    const i = Math.max(0, Math.min(playbackIndex ?? 0, last));
    restyleTargetRef.current = { i, trajectory };
    scheduleRestyle();

    return () => {
      if (restyleRafRef.current != null) {
        cancelAnimationFrame(restyleRafRef.current);
        restyleRafRef.current = null;
      }
    };
  }, [playbackIndex, trajectory]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {!plotlyReady && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#cbd5e1", fontSize: 11, fontFamily: MONO }}>
          <RotateCcw size={13} style={{ animation: "spin 1s linear infinite" }} />
          Завантаження 3D рушія…
        </div>
      )}
      <div ref={divRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
