import type { ICON_NAMES } from '@sobra/shared';
import {
  Baby,
  Briefcase,
  Bus,
  Car,
  CircleDollarSign,
  Coffee,
  CreditCard,
  Droplet,
  Dumbbell,
  Film,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Landmark,
  Music,
  PawPrint,
  PiggyBank,
  Plane,
  Receipt,
  Shirt,
  ShoppingCart,
  Smartphone,
  Sparkles,
  TrendingUp,
  Utensils,
  Wallet,
  Wifi,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';
import { View } from 'react-native';
import { makeStyles } from '../theme/makeStyles';
import { useTheme } from '../theme/ThemeProvider';

export type IconName = (typeof ICON_NAMES)[number];

/** `ICON_NAMES` (shared) → Lucide, as DESIGN.md maps them. */
const icons: Record<IconName, LucideIcon> = {
  cart: ShoppingCart,
  home: House,
  car: Car,
  bus: Bus,
  utensils: Utensils,
  film: Film,
  'heart-pulse': HeartPulse,
  'graduation-cap': GraduationCap,
  briefcase: Briefcase,
  gift: Gift,
  plane: Plane,
  shirt: Shirt,
  smartphone: Smartphone,
  wifi: Wifi,
  zap: Zap,
  droplet: Droplet,
  'piggy-bank': PiggyBank,
  'trending-up': TrendingUp,
  wallet: Wallet,
  'credit-card': CreditCard,
  receipt: Receipt,
  paw: PawPrint,
  dumbbell: Dumbbell,
  music: Music,
  coffee: Coffee,
  baby: Baby,
  wrench: Wrench,
  landmark: Landmark,
  sparkles: Sparkles,
  'circle-dollar': CircleDollarSign,
};

/** Lucide stroke from DESIGN.md (1,75 px). */
export const ICON_STROKE = 1.75;
/** Icon sizes from DESIGN.md: 20 in a row, 16 inside text. */
export const ICON_SIZE = { row: 20, inline: 16 } as const;

export function CategoryIcon({ name, size = ICON_SIZE.row }: { name: IconName; size?: number }) {
  const theme = useTheme();
  const Icon = icons[name];
  return <Icon size={size} color={theme.colors.text.secondary} strokeWidth={ICON_STROKE} />;
}

/** The 8px identity square of a category or account (the user's color appears only here). */
export function ColorSquare({ color }: { color: string }) {
  const styles = useStyles();
  return <View style={[styles.square, { backgroundColor: color }]} />;
}

const useStyles = makeStyles((t) => ({
  square: { width: t.space[2], height: t.space[2], borderRadius: t.radii.xs },
}));
