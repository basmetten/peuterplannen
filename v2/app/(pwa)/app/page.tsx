export const metadata = {
  title: 'Kaart',
};

export default function AppPage() {
  return (
    <div className="flex h-full items-center justify-center bg-bg-secondary">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <h1 className="text-[22px] font-normal tracking-[-0.032em] text-label">
          PeuterPlannen
        </h1>
        <p className="mt-2 text-[15px] tracking-normal text-label-secondary">
          Kaart wordt geladen...
        </p>
      </div>
    </div>
  );
}
