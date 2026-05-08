import { cn } from "@/lib/utils";

// Classic Telstar pattern: 1 centre pentagon + 5 surrounding.
// Pentagons: circumradius r=16, pointing-up orientation (a_start=-90°).
// Surrounding centres at distance 38 from ball centre (50,50), at 72° clock intervals.
// Each surrounding pentagon is rotated so a flat edge faces inward:
//   a_start for pentagon at clock-angle φ = φ − 90°
const Patches = () => (
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <polygon points="50,34 65.2,45.1 59.4,62.9 40.6,62.9 34.8,45.1" fill="#111" />
    <polygon points="50,-4 65.2,7.1 59.4,24.9 40.6,24.9 34.8,7.1" fill="#111" />
    <polygon points="101.4,33.4 95.6,51.2 76.8,51.2 71.0,33.4 86.2,22.3" fill="#111" />
    <polygon points="81.7,93.7 62.9,93.7 57.1,75.9 72.3,64.8 87.5,75.9" fill="#111" />
    <polygon points="18.3,93.7 37.1,93.7 42.9,75.9 27.7,64.8 12.5,75.9" fill="#111" />
    <polygon points="-1.4,33.4 4.4,51.2 23.2,51.2 29.0,33.4 13.8,22.3" fill="#111" />
  </svg>
);

export function BouncingBall({ size = "lg" }: { size?: "sm" | "lg" }) {
  const ballClass = size === "lg" ? "w-24 h-24" : "w-14 h-14";
  const containerHeight = size === "lg" ? "h-48" : "h-32";
  const shadowClass = size === "lg" ? "w-20" : "w-12";

  return (
    <div className={cn("flex flex-col items-center justify-end", containerHeight)}>
      <div
        className={cn(ballClass, "animate-bounce-ball flex-shrink-0")}
        style={{ "--bounce-height": size === "lg" ? "-110px" : "-68px" } as any}
      >
        <div
          className="w-full h-full rounded-full relative overflow-hidden"
          style={{
            background:
              "radial-gradient(circle at 35% 30%, #ffffff 0%, #e0e0e0 40%, #aaaaaa 72%, #555 100%)",
            boxShadow:
              "inset -4px -4px 14px rgba(0,0,0,0.55), inset 3px 3px 8px rgba(255,255,255,0.5)",
          }}
        >
          <div className="absolute inset-0 animate-ball-spin">
            <Patches />
          </div>
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at 32% 28%, rgba(255,255,255,0.6) 0%, transparent 52%)",
            }}
          />
        </div>
      </div>

      <div
        className={cn("h-2 rounded-full mt-1 animate-ball-shadow", shadowClass)}
        style={{
          background: "radial-gradient(ellipse, rgba(0,0,0,0.5) 0%, transparent 75%)",
        }}
      />
    </div>
  );
}
