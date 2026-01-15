export default function Card({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-amber-100 bg-white shadow-sm">
      <div className="p-6">
        {title && <h2 className="text-base font-semibold mb-2">{title}</h2>}
        {children}
      </div>
    </section>
  );
}
