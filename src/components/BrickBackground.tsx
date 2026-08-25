"use client";

export default function BrickBackground() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: "#1a1714",
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              transparent 0px,
              transparent 58px,
              rgba(10,8,6,0.7) 58px,
              rgba(10,8,6,0.7) 62px
            ),
            repeating-linear-gradient(
              90deg,
              transparent 0px,
              transparent 118px,
              rgba(10,8,6,0.6) 118px,
              rgba(10,8,6,0.6) 122px
            ),
            repeating-linear-gradient(
              90deg,
              transparent 0px,
              transparent 118px,
              rgba(10,8,6,0.6) 118px,
              rgba(10,8,6,0.6) 122px
            )
          `,
          backgroundSize: "100% 120px, 240px 120px, 240px 120px",
          backgroundPosition: "0 0, 0 0, 120px 60px",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 600px 400px at 15% 20%, rgba(35,28,20,0.5), transparent),
            radial-gradient(ellipse 500px 350px at 80% 55%, rgba(30,24,18,0.4), transparent),
            radial-gradient(ellipse 700px 500px at 50% 85%, rgba(28,22,16,0.35), transparent),
            radial-gradient(ellipse at center, transparent 35%, rgba(8,6,4,0.55) 100%)
          `,
        }}
      />
    </div>
  );
}
