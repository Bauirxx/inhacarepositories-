import { createElement } from "react";
import {
  BedDouble,
  Briefcase,
  Compass,
  CookingPot,
  Fish,
  HeartHandshake,
  HeartPulse,
  Home,
  Info,
  Landmark,
  Leaf,
  MapPin,
  Music,
  Package,
  Palette,
  Scroll,
  Shirt,
  Ship,
  ShoppingBag,
  Trophy,
  Users,
  Utensils,
  Waves,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/** Mapa estático de ícones (evita importar toda a biblioteca dinamicamente). */
const ICONS: Record<string, LucideIcon> = {
  "bed-double": BedDouble,
  home: Home,
  utensils: Utensils,
  waves: Waves,
  ship: Ship,
  compass: Compass,
  "shopping-bag": ShoppingBag,
  "heart-pulse": HeartPulse,
  landmark: Landmark,
  users: Users,
  fish: Fish,
  leaf: Leaf,
  palette: Palette,
  "cooking-pot": CookingPot,
  shirt: Shirt,
  wrench: Wrench,
  package: Package,
  briefcase: Briefcase,
  music: Music,
  trophy: Trophy,
  "heart-handshake": HeartHandshake,
  scroll: Scroll,
  info: Info,
};

export function getIcon(name: string | null | undefined): LucideIcon {
  return (name && ICONS[name]) || MapPin;
}

export function DynamicIcon({ name, className }: { name: string | null | undefined; className?: string }) {
  return createElement(getIcon(name), { className, "aria-hidden": true });
}

export const ICON_NAMES = Object.keys(ICONS);
