import { QueryProvider } from '@/providers/QueryProvider';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <div className="relative h-dvh w-full overflow-hidden">
        {children}
      </div>
    </QueryProvider>
  );
}
