export type ListItemTagVariant = 'cheap' | 'rated' | 'value' | 'fast' | 'category';

export interface ListItemTag {
  label: string;
  variant: ListItemTagVariant;
}

export interface ListItemInfoLine {
  icon?: string;
  text: string;
  chip?: boolean;
}

export interface ListItemRating {
  value: number | null;
  reviewCount: number;
}

export interface ListItemPrice {
  amount: number;
  currency: string;
  label?: string;
  prefix?: string;
}

export type ListItemActionType = 'add' | 'added' | 'view' | 'loading' | 'remove';

export interface ListItemAction {
  type: ListItemActionType;
  label: string;
  icon?: string;
}

export interface ListItemIconAction {
  id: string;
  icon: string;
  tooltip?: string;
}

export interface ListItemConfig {
  id: string;
  images?: string[];
  placeholderIcon: string;
  title: string;
  infoLines: ListItemInfoLine[];
  rating?: ListItemRating;
  description?: string;
  price?: ListItemPrice;
  primaryAction: ListItemAction;
  secondaryAction?: ListItemAction;
  iconActions?: ListItemIconAction[];
  tags?: ListItemTag[];
  isAdded?: boolean;
  isRecommended?: boolean;
}
