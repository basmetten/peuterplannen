import { QueryProvider } from '@/providers/QueryProvider';
import { MapStateProvider } from '@/context/MapStateContext';
import { PersistentMapLoader } from '@/components/layout/PersistentMapLoader';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <MapStateProvider>
        <div className="relative h-dvh w-full overflow-hidden">
          {/* Persistent map — desktop only, z-0 behind page content */}
          <div className="absolute inset-0 z-0 hidden md:block">
            <PersistentMapLoader />
          </div>
          {/* Page content — z-10 above map */}
          {children}
        </div>
      </MapStateProvider>
    </QueryProvider>
  );
}
