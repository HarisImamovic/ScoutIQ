import footballImg from "@/assets/football.png";

export function BouncingBall({ size = "lg" }: { size?: "sm" | "lg" }) {
  const ballSize = size === "lg" ? "w-24 h-24" : "w-14 h-14";
  const shadowWidth = size === "lg" ? "w-20" : "w-12";

  return (
    <div className="flex flex-col items-center justify-end h-48">
      <div className={`${ballSize} animate-bounce-ball`}>
        <img src={footballImg} alt="Football" className="w-full h-full object-contain drop-shadow-lg" />
      </div>
      <div className={`${shadowWidth} h-3 mt-2 rounded-full bg-foreground/10 animate-ball-shadow`} />
    </div>
  );
}
