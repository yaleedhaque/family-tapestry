"use client";

export default function BrickBackground() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Base dark stone layer */}
      <div className="absolute inset-0 bg-[#1a1714]" />

      {/* Mortar lines - horizontal */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 58px,
              rgba(30,26,22,0.9) 58px,
              rgba(30,26,22,0.9) 62px
            )
          `,
        }}
      />

      {/* Mortar lines - vertical (offset every other row) */}
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 118px,
              rgba(30,26,22,0.8) 118px,
              rgba(30,26,22,0.8) 122px
            )
          `,
          backgroundSize: "240px 120px",
          backgroundPosition: "0 0",
        }}
      />

      {/* Second vertical mortar row, offset half a brick */}
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 118px,
              rgba(30,26,22,0.8) 118px,
              rgba(30,26,22,0.8) 122px
            )
          `,
          backgroundSize: "240px 120px",
          backgroundPosition: "120px 60px",
        }}
      />

      {/* Brick face texture - subtle variation */}
      <div
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              rgba(60,52,42,0.4) 0px,
              rgba(45,38,30,0.2) 30px,
              rgba(55,48,38,0.3) 58px,
              transparent 62px
            ),
            repeating-linear-gradient(
              90deg,
              rgba(50,42,34,0.3) 0px,
              rgba(40,34,28,0.15) 60px,
              rgba(55,46,38,0.2) 118px,
              transparent 122px
            )
          `,
        }}
      />

      {/* Grunge / noise overlay for stone roughness */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(80,70,55,1) 1px, transparent 1px),
            radial-gradient(circle at 80% 70%, rgba(70,60,48,1) 1px, transparent 1px),
            radial-gradient(circle at 50% 10%, rgba(65,55,45,1) 1px, transparent 1px),
            radial-gradient(circle at 10% 80%, rgba(75,65,52,1) 1px, transparent 1px),
            radial-gradient(circle at 70% 40%, rgba(60,52,42,1) 1px, transparent 1px)
          `,
          backgroundSize: "137px 131px, 151px 149px, 127px 123px, 143px 139px, 133px 127px",
        }}
      />

      {/* Weathering stains - dark patches */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 400px 300px at 15% 20%, rgba(20,16,12,0.8), transparent),
            radial-gradient(ellipse 350px 250px at 85% 60%, rgba(18,14,10,0.6), transparent),
            radial-gradient(ellipse 300px 400px at 50% 80%, rgba(22,18,14,0.5), transparent),
            radial-gradient(ellipse 500px 200px at 30% 50%, rgba(16,12,8,0.4), transparent)
          `,
        }}
      />

      {/* Subtle vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(8,6,4,0.6) 100%)",
        }}
      />
    </div>
  );
}
