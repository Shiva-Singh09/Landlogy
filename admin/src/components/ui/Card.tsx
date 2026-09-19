import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  children?: ReactNode;
}

export interface CardSectionProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export function Card({ hoverable = false, className = "", ...rest }: CardProps) {
  return (
    <div
      className={[
        "rounded-xl border border-land-border bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,.06),0_2px_8px_rgba(0,0,0,.04)] sm:p-6",
        hoverable
          ? "transition-shadow duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,.08),0_1px_4px_rgba(0,0,0,.06)] motion-reduce:transition-none"
          : "",
        className,
      ].join(" ")}
      {...rest}
    />
  );
}

export function CardHeader({ className = "", ...rest }: CardSectionProps) {
  return (
    <div className={["mb-4 flex flex-col gap-1", className].join(" ")} {...rest} />
  );
}

export function CardContent({ className = "", ...rest }: CardSectionProps) {
  return <div className={["min-w-0", className].join(" ")} {...rest} />;
}

export function CardFooter({ className = "", ...rest }: CardSectionProps) {
  return (
    <div
      className={[
        "mt-5 flex flex-wrap items-center gap-3 border-t border-land-border pt-4",
        className,
      ].join(" ")}
      {...rest}
    />
  );
}
