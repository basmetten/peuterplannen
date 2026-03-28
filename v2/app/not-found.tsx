import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-[34px] font-bold tracking-[-0.031em] text-label">
          404
        </h1>
        <p className="mt-2 text-[17px] tracking-[-0.025em] text-label-secondary">
          Deze pagina bestaat niet.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center rounded-pill bg-accent px-6 text-[17px] font-semibold text-white"
        >
          Terug naar home
        </Link>
      </div>
    </div>
  );
}
