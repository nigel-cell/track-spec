import { Card, Label } from "../ui/Card";



const STEPS = [

  {

    title: "1. Start the relay on your PC",

    body: "Double-click START.bat or run npm run server in the project folder.",

    code: "START.bat",

  },

  {

    title: "2. Enable Data Out in Forza",

    body: "Options → HUD and Gameplay → bottom of page.",

    list: ["Data Out: ON", "Data Out IP: 127.0.0.1 (PC) or your PC IP (Xbox)", "Data Out Port: 9999"],

  },

  {

    title: "3. Open on iPhone or desktop",

    body: "Same Wi‑Fi as your PC. Use Safari on iPhone or any browser on desktop.",

    list: [

      "iPhone URL: http://<PC-IP>:3000",

      "Desktop: http://localhost:3000",

      "Tap Test mock on Live tab to preview without the game",

    ],

  },

];



interface SetupScreenProps {

  pcIp?: string;

}



export function SetupScreen({ pcIp }: SetupScreenProps) {

  const ip = pcIp || "192.168.1.52";



  return (

    <div className="mx-auto max-w-[820px] space-y-[var(--ts-section-gap)] px-4 py-5 pb-8 sm:px-6">

      <h1

        className="font-[family-name:var(--ts-font-heading)] text-2xl font-[number:var(--ts-heading-weight)]"

        style={{ letterSpacing: "var(--ts-heading-tracking)" }}

      >

        Connection Setup

      </h1>

      <p className="text-sm text-[var(--ts-muted)]">

        Track Spec runs its own telemetry relay on your PC — no third-party apps required.

      </p>

      {STEPS.map((s) => (

        <Card key={s.title}>

          <div

            className="mb-2 font-[family-name:var(--ts-font-heading)] text-base font-semibold"

            style={{ letterSpacing: "var(--ts-heading-tracking)" }}

          >

            {s.title}

          </div>

          {s.body && <p className="mb-3 text-sm text-[var(--ts-muted)]">{s.body}</p>}

          {s.code && (

            <code className="block rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-bg)] px-3 py-2.5 font-[family-name:var(--ts-font-mono)] text-sm text-[var(--ts-accent)]">

              {s.code}

            </code>

          )}

          {s.list && (

            <ul className="mt-2 space-y-1 pl-4 text-sm text-[var(--ts-muted)]">

              {s.list.map((item) => (

                <li key={item}>{item.replace("<PC-IP>", ip)}</li>

              ))}

            </ul>

          )}

        </Card>

      ))}

    </div>

  );

}


