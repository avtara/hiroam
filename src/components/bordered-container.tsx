import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BorderedContainerProps {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}

/**
 * A reusable container component with multi-border styling.
 * Works with any layout: grid, flex, or regular divs.
 *
 * @example
 * // With grid
 * <BorderedContainer>
 *   <div className="grid gap-3 sm:grid-cols-2">...</div>
 * </BorderedContainer>
 *
 * @example
 * // With regular divs
 * <BorderedContainer>
 *   <div>Content here</div>
 * </BorderedContainer>
 */
export function BorderedContainer({
  children,
  className,
  innerClassName,
}: BorderedContainerProps) {
  return (
    <div className={cn("border border-2 bg-white p-1 rounded-3xl", className)}>
      <div className={cn("p-2 bg-gray-100 rounded-3xl", innerClassName)}>
        <div className="rounded-3xl">{children}</div>
      </div>
    </div>
  );
}
