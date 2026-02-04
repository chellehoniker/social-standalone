import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

const sizes = {
  sm: { icon: "h-6 w-6", text: "text-base" },
  md: { icon: "h-8 w-8", text: "text-xl" },
  lg: { icon: "h-12 w-12", text: "text-2xl" },
};

/**
 * Author Automations Social Logo
 * Uses an SVG text logo with "AA" monogram
 */
export function Logo({ size = "md", showText = true, className }: LogoProps) {
  const { icon, text } = sizes[size];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* AA Monogram */}
      <div
        className={cn(
          "relative flex-shrink-0 flex items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold",
          icon
        )}
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full p-1"
        >
          <text
            x="16"
            y="22"
            textAnchor="middle"
            fill="currentColor"
            fontSize="14"
            fontWeight="bold"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            AA
          </text>
        </svg>
      </div>
      {showText && (
        <span className={cn("font-semibold whitespace-nowrap", text)}>
          Author Automations
        </span>
      )}
    </div>
  );
}
