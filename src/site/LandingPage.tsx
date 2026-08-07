import { useEffect } from "react";

const HERO = "./site/hero.webp";
const DOWNLOAD = "https://github.com/nigel-cell/track-spec/releases/latest";

/** Public marketing site — brand-first, then clear paths into the product. */
export function LandingPage() {
  useEffect(() => {
    document.title = "Track Spec — Forza Horizon tuning & live telemetry";
    const root = document.documentElement;
    root.style.setProperty("--ts-bg", "#070708");
    root.style.setProperty("--ts-text", "#f2f0eb");
    root.style.setProperty("--ts-muted", "#9a968c");
    root.style.setProperty("--ts-accent", "#e63228");
    root.style.setProperty("--ts-accent-soft", "rgba(230,50,40,0.14)");
    root.style.setProperty("--ts-border", "rgba(242,240,235,0.12)");
    root.style.setProperty("--ts-font-heading", '"Space Grotesk", system-ui, sans-serif');
    root.style.setProperty("--ts-font-body", '"Space Grotesk", system-ui, sans-serif');
  }, []);

  return (
    <div className="landing min-h-dvh bg-[#070708] text-[#f2f0eb]">
      {/* Full-bleed hero */}
      <section className="relative flex min-h-dvh flex-col overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={HERO}
            alt=""
            className="landing-hero-img h-full w-full object-cover object-[center_35%]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070708] via-[#070708]/55 to-[#070708]/25" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070708]/80 via-transparent to-transparent" />
        </div>

        <header className="relative z-10 flex items-center justify-between px-5 pb-2 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-10">
          <img src="./logo-banner.png" alt="Track Spec" className="h-8 w-auto sm:h-9" />
          <a
            href="./app"
            className="text-xs font-semibold uppercase tracking-[0.16em] text-[#f2f0eb]/80 transition hover:text-[#e63228]"
          >
            Open app
          </a>
        </header>

        <div className="relative z-10 flex flex-1 flex-col justify-end px-5 pb-14 pt-24 sm:px-10 sm:pb-20">
          <p className="landing-fade-1 mb-3 font-[family-name:var(--ts-font-heading)] text-[11px] font-semibold uppercase tracking-[0.28em] text-[#e63228]">
            Forza Horizon 6
          </p>
          <h1 className="landing-fade-2 max-w-[14ch] font-[family-name:var(--ts-font-heading)] text-[clamp(3.25rem,12vw,6.5rem)] font-bold leading-[0.92] tracking-[-0.03em]">
            Track Spec
          </h1>
          <p className="landing-fade-3 mt-5 max-w-md text-base leading-relaxed text-[#c9c4b8] sm:text-lg">
            Dial in FH6 tunes on your phone. Stream live telemetry from your PC when you race.
          </p>
          <div className="landing-fade-4 mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="./app"
              className="inline-flex min-h-12 items-center justify-center rounded-sm bg-[#e63228] px-7 text-sm font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[#ff3d33]"
            >
              Launch app
            </a>
            <a
              href={DOWNLOAD}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 items-center justify-center rounded-sm border border-[#f2f0eb]/25 px-7 text-sm font-bold uppercase tracking-[0.14em] text-[#f2f0eb] transition hover:border-[#e63228] hover:text-[#e63228]"
            >
              Download for Windows
            </a>
          </div>
        </div>
      </section>

      {/* One job: phone */}
      <section className="border-t border-[#f2f0eb]/10 px-5 py-20 sm:px-10">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-[family-name:var(--ts-font-heading)] text-3xl font-bold tracking-tight sm:text-4xl">
            Tune anywhere
          </h2>
          <p className="mt-4 max-w-xl text-[#9a968c] leading-relaxed">
            Open the web app on iPhone or desktop — garage browser, Quick Tune, saved setups, and
            full FH6 calc. Add to Home Screen for an app-like install. No PC required for tuning.
          </p>
        </div>
      </section>

      {/* One job: live */}
      <section className="border-t border-[#f2f0eb]/10 bg-[#0c0c0e] px-5 py-20 sm:px-10">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-[family-name:var(--ts-font-heading)] text-3xl font-bold tracking-tight sm:text-4xl">
            Live when you race
          </h2>
          <p className="mt-4 max-w-xl text-[#9a968c] leading-relaxed">
            Run <span className="text-[#f2f0eb]">TrackSpec-Live.exe</span> on your gaming PC. It
            starts the app and Forza UDP relay together — speed, RPM, tires, G-forces on the Live
            tab while you drive.
          </p>
          <a
            href={DOWNLOAD}
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-flex min-h-11 items-center text-sm font-bold uppercase tracking-[0.14em] text-[#e63228] hover:underline"
          >
            Get the Windows build →
          </a>
        </div>
      </section>

      {/* One job: how */}
      <section className="border-t border-[#f2f0eb]/10 px-5 py-20 sm:px-10">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-[family-name:var(--ts-font-heading)] text-3xl font-bold tracking-tight sm:text-4xl">
            Two ways in
          </h2>
          <ol className="mt-8 space-y-8">
            <li>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e63228]">01 — Phone</p>
              <p className="mt-2 text-lg font-semibold">Launch app → Share → Add to Home Screen</p>
              <p className="mt-1 text-[#9a968c]">Tune and browse the garage from Safari.</p>
            </li>
            <li>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e63228]">02 — PC Live</p>
              <p className="mt-2 text-lg font-semibold">Run TrackSpec-Live.exe</p>
              <p className="mt-1 text-[#9a968c]">
                Forza Data Out → this PC → port 9999. Open the Live tab.
              </p>
            </li>
          </ol>
        </div>
      </section>

      <footer className="border-t border-[#f2f0eb]/10 px-5 py-10 sm:px-10">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <img src="./logo-banner.png" alt="Track Spec" className="h-7 w-auto opacity-80" />
          <div className="flex flex-wrap gap-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#9a968c]">
            <a href="./app" className="hover:text-[#e63228]">
              App
            </a>
            <a href={DOWNLOAD} target="_blank" rel="noreferrer" className="hover:text-[#e63228]">
              Download
            </a>
            <a
              href="https://github.com/nigel-cell/track-spec"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#e63228]"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>

      <style>{`
        .landing-hero-img {
          animation: landing-ken 28s ease-in-out infinite alternate;
        }
        .landing-fade-1 { animation: landing-up 0.7s ease-out both; }
        .landing-fade-2 { animation: landing-up 0.8s 0.08s ease-out both; }
        .landing-fade-3 { animation: landing-up 0.8s 0.16s ease-out both; }
        .landing-fade-4 { animation: landing-up 0.8s 0.24s ease-out both; }
        @keyframes landing-up {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes landing-ken {
          from { transform: scale(1.05) translate3d(0, 0, 0); }
          to { transform: scale(1.12) translate3d(-1.5%, -1%, 0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .landing-hero-img, .landing-fade-1, .landing-fade-2, .landing-fade-3, .landing-fade-4 {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
