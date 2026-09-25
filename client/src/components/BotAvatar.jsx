import aibot from "../assets/aibot.png";

export default function BotAvatar({ className = "h-8 w-8", shake = false, typing = false }) {
  let animation = "";
  if (typing) animation = "animate-bot-shake-loop";
  else if (shake) animation = "animate-bot-shake";
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-emerald-100 ${className}`}
    >
      <img
        src={aibot}
        alt=""
        className={`h-[72%] w-[72%] object-contain motion-reduce:animate-none ${animation}`}
      />
    </span>
  );
}
