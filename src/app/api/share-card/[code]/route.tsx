import { ImageResponse } from "next/og";

const VALID_CODE = /^[OD][GM][PC][VE]$/;

function axisLabels(code: string) {
  const [a, b, c, d] = code.split("");
  return [
    a === "O" ? "Oily" : "Dry",
    b === "G" ? "Glow" : "Matte",
    c === "P" ? "Perfection focused" : "Convenient focused",
    d === "V" ? "Variable" : "Even",
  ];
}

export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const normalized = code.toUpperCase();
  if (!VALID_CODE.test(normalized)) {
    return new Response("Invalid Beauty Code", { status: 400 });
  }

  const axes = axisLabels(normalized);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#fff8f8",
          color: "#382d2d",
          padding: "72px",
        }}
      >
        <div style={{ fontSize: 34, letterSpacing: "0.22em", fontWeight: 700, color: "#b97b88" }}>
          LAYAD BEAUTY CODE
        </div>
        <div style={{ marginTop: 38, fontSize: 118, letterSpacing: "0.12em", fontWeight: 800, color: "#d88c9c" }}>
          {normalized}
        </div>
        <div style={{ marginTop: 34, display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
          {axes.map((axis) => (
            <div
              key={axis}
              style={{
                border: "2px solid #ead7db",
                borderRadius: 999,
                background: "white",
                padding: "14px 22px",
                fontSize: 24,
                fontWeight: 600,
                color: "#6f6063",
              }}
            >
              {axis}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 54, fontSize: 30, fontWeight: 700 }}>What is your Beauty Code?</div>
        <div style={{ marginTop: 18, fontSize: 24, color: "#806f72" }}>layad16.com</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
