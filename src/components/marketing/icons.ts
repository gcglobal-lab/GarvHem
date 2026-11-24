import {
  Calculator,
  Cloud,
  Compass,
  Globe,
  MonitorCog,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { ServiceIcon } from "@/config/services";

export const SERVICE_ICONS: Record<ServiceIcon, LucideIcon> = {
  globe: Globe,
  calculator: Calculator,
  cloud: Cloud,
  monitor: MonitorCog,
  compass: Compass,
  users: Users,
  sparkles: Sparkles,
};
