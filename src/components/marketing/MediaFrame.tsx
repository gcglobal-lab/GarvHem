import Image from "next/image";
import type { ReactNode } from "react";
import { INK_BLUR, type ImageAsset } from "@/config/media";
import { cn } from "@/lib/utils";

/** A configured photo, or the generated visual when there is none. Never a broken image. */
export function MediaFrame({
  asset,
  sizes,
  className,
  children,
}: {
  asset: ImageAsset | null | undefined;
  sizes: string;
  className?: string;
  children: ReactNode;
}) {
  if (!asset) return <>{children}</>;
  return (
    <div className={cn("relative overflow-hidden rounded-3xl", className)}>
      <Image
        src={asset.src}
        alt={asset.alt}
        width={asset.width}
        height={asset.height}
        sizes={sizes}
        placeholder="blur"
        blurDataURL={asset.blur ?? INK_BLUR}
        className="size-full object-cover"
      />
    </div>
  );
}
