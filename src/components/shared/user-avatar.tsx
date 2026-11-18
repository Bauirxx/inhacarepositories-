import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, initials } from "@/lib/utils";

interface UserAvatarProps {
  name: string | null | undefined;
  src?: string | null;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

const sizes = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-base",
  xl: "size-24 text-2xl",
};

export function UserAvatar({ name, src, className, size = "md" }: UserAvatarProps) {
  return (
    <Avatar className={cn(sizes[size], "ring-2 ring-background", className)}>
      {src ? <AvatarImage src={src} alt={name ?? ""} /> : null}
      <AvatarFallback className="bg-turquoise-light font-semibold text-ocean">
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
