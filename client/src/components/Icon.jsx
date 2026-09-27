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
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M15 20v-2H9v2c0 1.1.9 2 2 2h2c1.1 0 2-.9 2-2m-6.81-4.92c.13.18.29.53.43.92h6.76c.15-.39.3-.74.43-.92c.35-.5.72-.93 1.08-1.36c1.03-1.21 2.1-2.46 2.1-4.72c0-3.86-3.14-7-7-7s-7 3.14-7 7c0 2.28 1.07 3.53 2.1 4.73c.36.42.73.85 1.09 1.35ZM12 5v2c-1.1 0-2 .9-2 2H8c0-2.21 1.79-4 4-4"
      />
    </svg>
  );
}
