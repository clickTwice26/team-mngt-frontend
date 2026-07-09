import { BackendStatus } from "@/components/backend-status";
import { Button } from "@/components/ui/button";
import { env } from "@/config/env";

const features = [
  {
    title: "FastAPI backend",
    description:
      "Async, typed API with a clean layered architecture: routers → services → repositories.",
  },
  {
    title: "MongoDB",
    description:
      "Powered by the official async PyMongo driver with Pydantic v2 models and indexes.",
  },
  {
    title: "Next.js frontend",
    description:
      "App Router, TypeScript, Tailwind CSS v4 and a typed API client wired to the backend.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-10 px-6 py-16">
      <header className="flex flex-col gap-4">
        <span className="w-fit rounded-full border border-black/10 px-3 py-1 text-xs font-medium tracking-wide text-black/60 dark:border-white/15 dark:text-white/60">
          TEAM MANAGEMENT · MONOREPO
        </span>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Full-stack starter, ready to build on.
        </h1>
        <p className="text-base text-black/60 dark:text-white/60">
          A professional baseline pairing a FastAPI + MongoDB backend with a
          Next.js frontend. Everything is wired together — start shipping
          features, not boilerplate.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer">
          <Button>Open API docs</Button>
        </a>
        <a href={env.apiUrl} target="_blank" rel="noreferrer">
          <Button variant="secondary">Backend root</Button>
        </a>
      </div>

      <BackendStatus />

      <section className="grid gap-4 sm:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="rounded-xl border border-black/10 p-4 dark:border-white/15"
          >
            <h2 className="text-sm font-semibold">{feature.title}</h2>
            <p className="mt-1 text-xs text-black/60 dark:text-white/60">
              {feature.description}
            </p>
          </div>
        ))}
      </section>
    </main>
  );
}
