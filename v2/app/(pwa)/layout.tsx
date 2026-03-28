export default function PwaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative h-dvh w-full overflow-hidden">
      {children}
    </div>
  );
}
