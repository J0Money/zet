import { ImageResponse } from "next/og";

// Genereret på serveren med Next.js' indbyggede ImageResponse, i stedet for
// en statisk billedfil, så ikonet altid matcher brandfarven uden en separat
// designfil at vedligeholde. En fast URL (ikke Next.js' icon-konvention),
// så manifest.ts trygt kan pege direkte på den.
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#4f46e5",
          color: "white",
          fontSize: 108,
          fontWeight: 700,
          fontFamily: "sans-serif",
          letterSpacing: -4,
        }}
      >
        Z
      </div>
    ),
    { width: 192, height: 192 },
  );
}
