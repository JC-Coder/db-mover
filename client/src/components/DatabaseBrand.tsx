import { cn } from "@/lib/utils";
import {
  getDatabaseBrand,
  type DatabaseBrandId,
  type DatabaseBrandTheme,
  type DatabaseBrandVariant,
} from "@/lib/databaseBrands";

interface IDatabaseBrandProps {
  db: DatabaseBrandId | string | undefined;
  theme?: DatabaseBrandTheme;
  variant?: DatabaseBrandVariant;
  className?: string;
  imageClassName?: string;
}

export function DatabaseBrand({
  db,
  theme = "dark",
  variant = "icon",
  className,
  imageClassName,
}: IDatabaseBrandProps) {
  const brand = getDatabaseBrand(db);

  if (!brand) {
    return null;
  }

  return (
    <span
      className={cn("inline-flex items-center justify-center", className)}
      aria-label={brand.label}
      title={brand.label}
    >
      <img
        src={brand.assets[variant][theme]}
        alt=""
        className={cn("block max-h-full max-w-full object-contain", imageClassName)}
        draggable={false}
      />
      <span className="sr-only">{brand.label}</span>
    </span>
  );
}
