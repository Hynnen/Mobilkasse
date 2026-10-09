import { logout } from './login/actions';

// Midlertidig forside til kasse-UI bygges i steg 7.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-lg">Du er logget inn. Kassen kommer her.</p>
      <form action={logout}>
        <button type="submit" className="h-14 rounded-xl border border-zinc-300 px-6 text-lg">
          Logg ut
        </button>
      </form>
    </main>
  );
}
