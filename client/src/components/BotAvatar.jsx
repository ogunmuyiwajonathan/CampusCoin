import aibot from "../assets/aibot.png";

export default function BotAvatar({ className = "h-10 w-10", animate = true }) {
  return (
    <img
      src={aibot}
      alt=""
      className={`shrink-0 object-contain ${animate ? "animate-bot-shake motion-reduce:animate-none" : ""} ${className}`}
    />
  );
}
