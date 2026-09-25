import aibot from "../assets/aibot.png";

export default function BotAvatar({ className = "h-10 w-10" }) {
  return (
    <img
      src={aibot}
      alt=""
      className={`shrink-0 animate-bot-shake object-contain motion-reduce:animate-none ${className}`}
    />
  );
}
