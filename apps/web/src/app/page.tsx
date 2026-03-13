import SDLCBoard from "@/components/SDLCBoard";

export default function HomePage() {
  return (
    <main className="min-h-screen p-6 max-w-[1600px] mx-auto">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-blue-400">🤖 TEDU AI Dev Team</h1>
          <p className="text-gray-500 mt-0.5 text-sm">
            SDLC pipeline · Jira → Code → GitHub PR
          </p>
        </div>
      </header>
      <SDLCBoard />
    </main>
  );
}