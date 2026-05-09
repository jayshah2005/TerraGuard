import Map from '../components/Map';
import InsightsPanel from '../components/InsightsPanel';

export default function Home() {
  return (
    <main className="flex h-screen w-screen bg-gray-900 text-white">
      {/* Map Section - 70% width on desktop */}
      <div className="w-full lg:w-2/3 h-full relative z-0">
        <Map />
      </div>

      {/* Side Panel - 30% width on desktop */}
      <div className="w-full lg:w-1/3 h-full bg-gray-900 border-l border-gray-800 shadow-2xl p-6 overflow-y-auto z-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
            TerraGuard
          </h1>
          <p className="text-gray-400 mt-2 text-sm text-balance">
            AI-powered Crop Failure Early Warning System
          </p>
        </div>
        
        <InsightsPanel />
      </div>
    </main>
  );
}