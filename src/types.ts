export type EntitiesBaseList = Record<string, string | number>;
export type EntitiesList = Record<string, string>;
export type Namespace = Record<string, string>;
export type EventHandler = (data?: unknown) => void;

export interface DetailedAttribute {
  name: string;
  value: string;
  prefix: string;
  local: string;
  uri: string;
}

export interface TagElem {
  name: string;
  attributes: Record<string, string | DetailedAttribute>;
  ns?: Namespace;
  prefix?: string;
  local?: string;
  uri?: string;
  isSelfClosing?: boolean;
}
