import { Card, Label } from "../ui/Card";



const STEPS = [

  {

    title: "1. Open Track Spec on this PC",

    body: "Double-click TrackSpec-Live.exe. That starts the Live relay. You do not need START.bat if you are using the exe.",

  },

  {

    title: "2. Enable Data Out in Forza Horizon 6",

    body: "Settings → HUD and Gameplay → scroll to Data Out. FH6 only sends packets while you are driving — not in menus, pause, or replay.",

    list: ["Data Out: ON", "Data Out IP: 127.0.0.1 (same PC) or this PC’s Wi-Fi IP (Xbox)", "Data Out Port: 9999"],

  },

  {

    title: "3. Drive, then open Live",

    body: "Start driving in FH6. Live should switch to Game connected. On a phone, same Wi-Fi, type the PC IP on the Live tab.",

    list: [

      "iPhone: enter the PC IP on Live (not the Cloudflare site for Data Out)",

      "Desktop exe: leave the IP blank",

      "Tap Test mock on Live to preview without the game",

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


