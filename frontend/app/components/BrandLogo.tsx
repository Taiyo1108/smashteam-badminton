import Image from "next/image";
import { memo } from "react";

type Props = {
  size?: number;
  rounded?: string;
  priority?: boolean;
};

/** Logo SmashTeam dùng chung — đồng bộ với nav trang chủ. */
function BrandLogo({ size = 32, rounded = "rounded-xl", priority = false }: Props) {
  return (
    <Image
      src="/logo.png"
      alt="SmashTeam logo"
      width={size}
      height={size}
      priority={priority}
      loading={priority ? undefined : "lazy"}
      className={`${rounded} object-cover shrink-0`}
      style={{ width: size, height: size }}
    />
  );
}

export default memo(BrandLogo);
