import {
  ArrowDown,
  ArrowDownRight,
  ArrowLeftRight,
  ArrowRight,
  ArrowUp,
  Bell,
  Bookmark,
  BookOpen,
  Briefcase,
  Bus,
  Calendar,
  Car,
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
  FileChartColumn,
  FileDown,
  FileText,
  Coffee,
  Dumbbell,
  Filter,
  Gamepad2,
  Gift,
  Globe,
  GraduationCap,
  HeartPulse,
  History,
  House,
  Info,
  LayoutDashboard,
  Lightbulb,
  LogIn,
  LogOut,
  Mail,
  Megaphone,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Moon,
  Music,
  Pencil,
  Plane,
  PiggyBank,
  Plus,
  Repeat,
  Save,
  Search,
  Send,
  Settings,
  Shirt,
  Shield,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Sun,
  Tag,
  Tags,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Image,
  NotebookPen,
  RotateCcw,
  Share2,
  Tv,
  Undo2,
  Upload,
  User,
  Users,
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
  bookmark: Bookmark,
  bot: BotIcon,
  "book-open": BookOpen,
  briefcase: Briefcase,
  bus: Bus,
  calendar: Calendar,
  camera: Camera,
  car: Car,
  "chart-column": ChartColumn,
  "chart-pie": ChartPie,
  check: Check,
  coffee: Coffee,
  "chevron-down": ChevronDown,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  clock: Clock,
  database: Database,
  dumbbell: Dumbbell,
  ellipsis: Ellipsis,
  eye: Eye,
  "eye-off": EyeOff,
  "file-text": FileText,
  filter: Filter,
  "gamepad-2": Gamepad2,
  gift: Gift,
  globe: Globe,
  "graduation-cap": GraduationCap,
  history: History,
  house: House,
  "heart-pulse": HeartPulse,
  info: Info,
  "layout-dashboard": LayoutDashboard,
  lightbulb: Lightbulb,
  lock: LockIcon,
  "log-in": LogIn,
  "log-out": LogOut,
  mail: Mail,
  megaphone: Megaphone,
  menu: Menu,
  "message-square": MessageSquare,
  "more-horizontal": MoreHorizontal,
  moon: Moon,
  music: Music,
  pencil: Pencil,
  "piggy-bank": PiggyBank,
  plane: Plane,
  plus: Plus,
  repeat: Repeat,
  save: Save,
  search: Search,
  send: Send,
  settings: Settings,
  shirt: Shirt,
  shield: Shield,
  "shopping-bag": ShoppingBag,
  smartphone: Smartphone,
  sparkles: Sparkles,
  sun: Sun,
  tag: Tag,
  tags: Tags,
  target: Target,
  "trash-2": Trash2,
  "trending-down": TrendingDown,
  "trending-up": TrendingUp,
  "triangle-alert": TriangleAlert,
  "file-chart": FileChartColumn,
  "file-down": FileDown,
  image: Image,
  "notebook-pen": NotebookPen,
  "rotate-ccw": RotateCcw,
  share: Share2,
  trash: Trash2,
  tv: Tv,
  undo: Undo2,
  upload: Upload,
  user: User,
  users: Users,
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
