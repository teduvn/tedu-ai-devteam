import AgentDashboard from "@/components/AgentDashboard";

export default function HomePage() {
  return (
    <main className="min-h-screen p-6 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-blue-400">
          🤖 TEDU AI Dev Team
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          Automates SDLC from Jira ticket → Code → GitHub PR
        </p>
      </header>
      <AgentDashboard />
    </main>
  );
}