// Delt SVG-indhold til app-ikonerne (icon-192, icon-512, apple-icon), så
// formen kun er defineret ét sted. Baseret på Joes design (en håndvægt, der
// danner et "Z"). Varm hvid baggrund, selve Z'et (stangen) i en gråtone, og
// vægtskiverne i appens indigo-brandfarve (#4f46e5, samme som theme_color i
// manifest.ts og layout.tsx), efter Joes ønske.
export function ZetIconSvg({ size }: { size: number }) {
  const barColor = "#52525b"; // zinc-600, selve "Z"-stangen
  const plateColor = "#4f46e5"; // indigo-600, appens brandfarve

  return (
    <svg width={size} height={size} viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      <rect width="1024" height="1024" fill="#faf8f5" />
      <g transform="translate(512 512) scale(0.88) translate(-512 -512)">
        {/* Diagonal forbindelse */}
        <polygon points="588.5,340 728.5,340 435.5,684 295.5,684" fill={barColor} />
        {/* Øverste stang med vægtskiver i højre side */}
        <rect x="232" y="270" width="488" height="80" fill={barColor} />
        <rect x="720" y="200" width="65" height="220" rx="12" fill={plateColor} />
        <rect x="797" y="230" width="50" height="160" rx="12" fill={plateColor} />
        {/* Nederste stang med vægtskiver i venstre side */}
        <rect x="304" y="674" width="488" height="80" fill={barColor} />
        <rect x="239" y="604" width="65" height="220" rx="12" fill={plateColor} />
        <rect x="177" y="634" width="50" height="160" rx="12" fill={plateColor} />
      </g>
    </svg>
  );
}
