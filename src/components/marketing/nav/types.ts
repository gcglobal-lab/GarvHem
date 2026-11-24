import type { Service } from "@/config/services";

export type MenuService = Pick<Service, "slug" | "name" | "summary" | "icon">;
