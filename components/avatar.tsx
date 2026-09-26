// A member's photo, or their first initial if they have none.
export function Avatar({ name, picture, size = 96 }: { name?: string | null; picture?: string | null; size?: number }) {
  const style = { width: size, height: size, fontSize: size * 0.4 };
  return picture ? (
    // A plain <img>: photo hosts vary, so next/image would need them configured.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={picture} alt={name ?? ""} title={name ?? undefined} style={style} className="rounded-full object-cover" />
  ) : (
    <div
      title={name ?? undefined}
      style={style}
      className="flex items-center justify-center rounded-full bg-neutral-200 font-semibold text-neutral-600"
    >
      {name?.[0] ?? "?"}
    </div>
  );
}
