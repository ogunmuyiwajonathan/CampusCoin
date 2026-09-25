import {
  ArrowDownRight,
  ArrowLeftRight,
  Bell,
  Bot,
  BookOpen,
  Briefcase,
  Bus,
  ChartColumn,
  ChevronDown,
  Ellipsis,
  Gamepad2,
  Gift,
  GraduationCap,
  House,
  LogOut,
  Menu,
  PiggyBank,
  Search,
  Settings,
  Target,
  TrendingDown,
  TrendingUp,
  Tv,
  User,
  Utensils,
  Wallet,
} from "lucide-react";

/** Name -> component registry (lucide-react, bundled offline - no icon API). */
const ICONS = {
  "arrow-down-right": ArrowDownRight,
  "arrow-left-right": ArrowLeftRight,
  bell: Bell,
  bot: Bot,
  "book-open": BookOpen,
  briefcase: Briefcase,
  bus: Bus,
  "chart-column": ChartColumn,
  "chevron-down": ChevronDown,
  ellipsis: Ellipsis,
  "gamepad-2": Gamepad2,
  gift: Gift,
  "graduation-cap": GraduationCap,
  house: House,
  "log-out": LogOut,
  menu: Menu,
  "piggy-bank": PiggyBank,
  search: Search,
  settings: Settings,
  target: Target,
  "trending-down": TrendingDown,
  "trending-up": TrendingUp,
  tv: Tv,
  user: User,
  utensils: Utensils,
  wallet: Wallet,
};

/**
 * Single icon entry point: <Icon name="wallet" size={18} />.
 * Keeps lucide-react in one file - swapping libraries touches only this file.
 */
export default function Icon({ name, size = 18, className }) {
  const Component = ICONS[name];
  if (!Component) return null;
  return <Component size={size} className={className} strokeWidth={2} aria-hidden="true" />;
}
