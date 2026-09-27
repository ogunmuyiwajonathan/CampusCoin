import {
  ArrowDown,
  ArrowDownRight,
  ArrowLeftRight,
  ArrowRight,
  ArrowUp,
  Bell,
  BookOpen,
  Briefcase,
  Bus,
  Calendar,
  Camera,
  ChartColumn,
  ChartPie,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Database,
  Ellipsis,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Gamepad2,
  Gift,
  Globe,
  GraduationCap,
  House,
  Info,
  Lightbulb,
  LogIn,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  Moon,
  Pencil,
  PiggyBank,
  Plus,
  Repeat,
  Save,
  Search,
  Send,
  Settings,
  Shield,
  Smartphone,
  Sparkles,
  Sun,
  Tag,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Tv,
  User,
  Utensils,
  Wallet,
  X,
} from "lucide-react";

const ICONS = {
  "arrow-down": ArrowDown,
  "arrow-down-right": ArrowDownRight,
  "arrow-left-right": ArrowLeftRight,
  "arrow-right": ArrowRight,
  "arrow-up": ArrowUp,
  bell: Bell,
  bot: BotIcon,
  "book-open": BookOpen,
  briefcase: Briefcase,
  bus: Bus,
  bulb: BulbIcon,
  calendar: Calendar,
  camera: Camera,
  "chart-column": ChartColumn,
  "chart-pie": ChartPie,
  check: Check,
  "chevron-down": ChevronDown,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  clock: Clock,
  database: Database,
  ellipsis: Ellipsis,
  eye: Eye,
  "eye-off": EyeOff,
  "file-text": FileText,
  filter: Filter,
  "gamepad-2": Gamepad2,
  gift: Gift,
  globe: Globe,
  "graduation-cap": GraduationCap,
  house: House,
  info: Info,
  lightbulb: Lightbulb,
  lock: LockIcon,
  "log-in": LogIn,
  "log-out": LogOut,
  mail: Mail,
  menu: Menu,
  "message-square": MessageSquare,
  moon: Moon,
  pencil: Pencil,
  "piggy-bank": PiggyBank,
  plus: Plus,
  repeat: Repeat,
  save: Save,
  search: Search,
  send: Send,
  settings: Settings,
  shield: Shield,
  smartphone: Smartphone,
  sparkles: Sparkles,
  sun: Sun,
  tag: Tag,
  target: Target,
  "trash-2": Trash2,
  "trending-down": TrendingDown,
  "trending-up": TrendingUp,
  "triangle-alert": TriangleAlert,
  tv: Tv,
  user: User,
  utensils: Utensils,
  wallet: Wallet,
  x: X,
  zap: BoltIcon,
  bolt: BoltIcon,
};

export default function Icon({ name, size = 18, className }) {
  const Component = ICONS[name];
  if (!Component) return null;
  return <Component size={size} className={className} strokeWidth={2} aria-hidden="true" />;
}

function BotIcon({ size = 18, className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={className}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M8 0a1 1 0 0 1 .5 1.864V4H11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2.5V1.864A.998.998 0 0 1 8 0M5 10v2h6v-2zm.5-4a1.5 1.5 0 1 0 0 3a1.5 1.5 0 0 0 0-3m5 0a1.5 1.5 0 1 0 0 3a1.5 1.5 0 0 0 0-3m-9 1a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-1 0v-3a.5.5 0 0 1 .5-.5m13 0a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-1 0v-3a.5.5 0 0 1 .5-.5"
      />
    </svg>
  );
}

function LockIcon({ size = 18, className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      className={className}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M832 464h-68V240c0-70.7-57.3-128-128-128H388c-70.7 0-128 57.3-128 128v224h-68c-17.7 0-32 14.3-32 32v384c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V496c0-17.7-14.3-32-32-32M540 701v53c0 4.4-3.6 8-8 8h-40c-4.4 0-8-3.6-8-8v-53a48.01 48.01 0 1 1 56 0m152-237H332V240c0-30.9 25.1-56 56-56h248c30.9 0 56 25.1 56 56z"
      />
    </svg>
  );
}

function BoltIcon({ size = 18, className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={className}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M9 7h2.898a.5.5 0 0 1 .376.83L6 15l1-6H4.102a.5.5 0 0 1-.377-.83L10 1z"
      />
    </svg>
  );
}

function BulbIcon({ size = 18, className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
    >
      <g fill="none">
        <path
          fill="#9b9b9b"
          d="M17.651 22.27h-3.89c-.79 0-1.44.64-1.43 1.43v3.89c0 .79.64 1.43 1.43 1.43h.248a1.94 1.94 0 0 0 3.384 0h.258c.79 0 1.43-.64 1.43-1.43V23.7c0-.79-.64-1.43-1.43-1.43"
        />
        <path
          fill="#fcd53f"
          d="M18.161 23.13c.24 0 .43-.18.45-.41.07-.86.44-2.95 2.46-5.19a8.66 8.66 0 0 0 3.29-6.31c.02-.24.03-.4.03-.5v-.1c-.06-4.78-3.93-8.62-8.7-8.62a8.69 8.69 0 0 0-8.69 8.6s-.01.24.03.64c.16 2.54 1.4 4.79 3.29 6.28c2.02 2.25 2.42 4.34 2.49 5.2c.02.23.21.41.45.41z"
        />
        <path
          fill="#ffb02e"
          d="M15.701 10.7c1.62 0 2.94 1.31 2.96 2.93v.08c0 .03 0 .07-.01.13-.05.84-.46 1.63-1.12 2.15l-.07.05l-.06.06c-1.1 1.22-1.33 4.32-1.37 6.02h-.65c-.05-1.7-.29-4.8-1.39-6.02l-.06-.06l-.07-.05a2.96 2.96 0 0 1-1.12-2.17c0-.04-.01-.07-.01-.09v-.09c.03-1.62 1.36-2.94 2.97-2.94m0-1a3.96 3.96 0 0 0-2.45 7.07c1.2 1.34 1.14 6.36 1.14 6.36h2.64s-.08-5.02 1.13-6.35c.86-.68 1.43-1.71 1.5-2.88c.01-.11.01-.18.01-.23v-.04a3.97 3.97 0 0 0-3.97-3.93"
        />
        <path
          fill="#d3d3d3"
          d="M19.167 25.053a.5.5 0 1 0-.172-.986l-6.74 1.18a.5.5 0 1 0 .172.986zm-.05 2.15a.5.5 0 0 0-.172-.985l-6.65 1.17a.5.5 0 1 0 .173.984z"
        />
        <path
          fill="#fff478"
          d="M13.791 5.44c-1.11 1.92-.55 4.32 1.25 5.35s4.15.32 5.26-1.6s.55-4.32-1.25-5.35s-4.15-.32-5.26 1.6"
        />
      </g>
    </svg>
  );
}
