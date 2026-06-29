export type DatabaseBrandId =
  | "mongodb"
  | "postgres"
  | "postgresql"
  | "mysql"
  | "redis"
  | "firebase";

export type DatabaseBrandTheme = "dark" | "light";
export type DatabaseBrandVariant = "icon" | "wordmark";

interface IDatabaseBrandAssetSet {
  light: string;
  dark: string;
}

interface IDatabaseBrandAssets {
  icon: IDatabaseBrandAssetSet;
  wordmark: IDatabaseBrandAssetSet;
}

export interface IDatabaseBrand {
  id: Exclude<DatabaseBrandId, "postgresql">;
  label: string;
  assets: IDatabaseBrandAssets;
}

const DB_LOGO_ROOT = "/db-logos";

export const DATABASE_BRANDS: IDatabaseBrand[] = [
  {
    id: "mongodb",
    label: "MongoDB",
    assets: {
      icon: {
        light: `${DB_LOGO_ROOT}/mongodb-icon-light.svg`,
        dark: `${DB_LOGO_ROOT}/mongodb-icon-dark.svg`,
      },
      wordmark: {
        light: `${DB_LOGO_ROOT}/mongodb-wordmark-light.svg`,
        dark: `${DB_LOGO_ROOT}/mongodb-wordmark-dark.svg`,
      },
    },
  },
  {
    id: "postgres",
    label: "PostgreSQL",
    assets: {
      icon: {
        light: `${DB_LOGO_ROOT}/postgresql-icon.svg`,
        dark: `${DB_LOGO_ROOT}/postgresql-icon.svg`,
      },
      wordmark: {
        light: `${DB_LOGO_ROOT}/postgresql-wordmark-light.svg`,
        dark: `${DB_LOGO_ROOT}/postgresql-wordmark-dark.svg`,
      },
    },
  },
  {
    id: "mysql",
    label: "MySQL",
    assets: {
      icon: {
        light: `${DB_LOGO_ROOT}/mysql-icon-light.svg`,
        dark: `${DB_LOGO_ROOT}/mysql-icon-dark.svg`,
      },
      wordmark: {
        light: `${DB_LOGO_ROOT}/mysql-wordmark-light.svg`,
        dark: `${DB_LOGO_ROOT}/mysql-wordmark-dark.svg`,
      },
    },
  },
  {
    id: "redis",
    label: "Redis",
    assets: {
      icon: {
        light: `${DB_LOGO_ROOT}/redis-icon.svg`,
        dark: `${DB_LOGO_ROOT}/redis-icon.svg`,
      },
      wordmark: {
        light: `${DB_LOGO_ROOT}/redis-icon.svg`,
        dark: `${DB_LOGO_ROOT}/redis-icon.svg`,
      },
    },
  },
  {
    id: "firebase",
    label: "Firebase",
    assets: {
      icon: {
        light: `${DB_LOGO_ROOT}/firebase-icon.svg`,
        dark: `${DB_LOGO_ROOT}/firebase-icon.svg`,
      },
      wordmark: {
        light: `${DB_LOGO_ROOT}/firebase-wordmark.svg`,
        dark: `${DB_LOGO_ROOT}/firebase-wordmark.svg`,
      },
    },
  },
];

export const getDatabaseBrand = (
  db: DatabaseBrandId | string | undefined,
): IDatabaseBrand | undefined => {
  const normalized = db === "postgresql" ? "postgres" : db;
  return DATABASE_BRANDS.find((brand) => brand.id === normalized);
};
