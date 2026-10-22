import { ImageResponse } from "next/og";
import { ZetIconSvg } from "@/app/components/zet-icon";

// Genereret på serveren med Next.js' indbyggede ImageResponse, i stedet for
// en statisk billedfil, så ikonet altid matcher brandfarverne uden en
// separat designfil at vedligeholde. En fast URL (ikke Next.js' egen
// icon-konvention), så manifest.ts trygt kan pege direkte på den.
export async function GET() {
  return new ImageResponse(<ZetIconSvg size={192} />, { width: 192, height: 192 });
}
