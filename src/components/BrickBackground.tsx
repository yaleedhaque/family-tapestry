"use client";

const BRICK_SVG = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="120" viewBox="0 0 240 120">
  <rect width="240" height="120" fill="#1a1714"/>
  <rect x="0" y="0" width="118" height="58" rx="1" fill="#221e19" stroke="#0e0b0a" stroke-width="2"/>
  <rect x="122" y="0" width="118" height="58" rx="1" fill="#252018" stroke="#0e0b0a" stroke-width="2"/>
  <rect x="60" y="62" width="118" height="58" rx="1" fill="#1f1b16" stroke="#0e0b0a" stroke-width="2"/>
  <rect x="-60" y="62" width="118" height="58" rx="1" fill="#231f1a" stroke="#0e0b0a" stroke-width="2"/>
  <rect x="182" y="62" width="118" height="58" rx="1" fill="#201c17" stroke="#0e0b0a" stroke-width="2"/>
</svg>`)}`;

export default function BrickBackground() {
  return (
    <div
      className="absolute inset-0 z-0 pointer-events-none"
      style={{
        backgroundImage: `url("${BRICK_SVG}")`,
        backgroundSize: "240px 120px",
        backgroundRepeat: "repeat",
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, transparent 30%, rgba(8,6,4,0.5) 100%)",
        }}
      />
    </div>
  );
}
