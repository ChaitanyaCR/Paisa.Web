import {
  BriefcaseBusiness,
  Car,
  Heart,
  House,
  Laptop,
  ShoppingBag,
  Tags,
  Utensils,
  Wallet,
} from 'lucide-react';

/**
 * Icons for the seed categories. Anything created through the UI gets a random
 * id and falls back to the generic tag — Phase 5.1 adds a stored icon and a
 * picker so user categories are not all identical.
 */
const icons: Record<string, typeof Wallet> = {
  salary: BriefcaseBusiness,
  freelance: Laptop,
  home: House,
  food: Utensils,
  shopping: ShoppingBag,
  transport: Car,
  health: Heart,
};

export function iconFor(categoryId: string): typeof Wallet {
  return icons[categoryId] ?? Tags;
}
