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

const icons: Record<string, typeof Wallet> = {
  salary: BriefcaseBusiness,
  freelance: Laptop,
  home: House,
  food: Utensils,
  shopping: ShoppingBag,
  transport: Car,
  health: Heart,
};

export const categoryIconOptions = [
  { value: 'tags', label: 'General' },
  { value: 'salary', label: 'Work' },
  { value: 'freelance', label: 'Computer' },
  { value: 'home', label: 'Home' },
  { value: 'food', label: 'Food' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'transport', label: 'Transport' },
  { value: 'health', label: 'Health' },
] as const;

export function iconFor(icon: string): typeof Wallet {
  return icons[icon] ?? Tags;
}
