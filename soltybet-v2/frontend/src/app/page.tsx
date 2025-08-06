"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useGame } from "@/contexts/GameContext";
import { StreamPlayer } from "@/components/game/StreamPlayer";

export default function Home() {
  const { connected, publicKey } = useWallet();
  const { state } = useGame();

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              SoltyBet v2
            </h1>
            <WalletMultiButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Stream Section - Takes up 2/3 on desktop */}
          <div className="lg:col-span-2 space-y-6">
            {/* Live Stream */}
            <div className="bg-gray-900/50 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Live Stream</h2>
              <StreamPlayer height="400px" />
            </div>

            {/* Match Info */}
            <div className="bg-gray-900/50 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Current Match</h2>
              {!state.currentMatch ? (
                <div className="text-center py-8 text-gray-400">
                  <p>Waiting for next match...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-red-400">
                        {state.currentMatch.redFighter.name}
                      </div>
                      <div className="text-sm text-gray-400">
                        {state.currentMatch.redFighter.wins}W -{" "}
                        {state.currentMatch.redFighter.losses}L
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-400">VS</div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-blue-400">
                        {state.currentMatch.blueFighter.name}
                      </div>
                      <div className="text-sm text-gray-400">
                        {state.currentMatch.blueFighter.wins}W -{" "}
                        {state.currentMatch.blueFighter.losses}L
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Betting & Info */}
          <div className="space-y-6">
            {/* Game Status */}
            <div className="bg-gray-900/50 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Game Status</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Phase:</span>
                  <span
                    className={`px-2 py-1 rounded text-sm ${
                      state.phase === "betting"
                        ? "bg-green-600"
                        : state.phase === "fighting"
                        ? "bg-red-600"
                        : "bg-gray-600"
                    }`}
                  >
                    {state.phase.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Betting Gate:</span>
                  <span
                    className={`px-2 py-1 rounded text-sm ${
                      state.isGateOpen ? "bg-green-600" : "bg-red-600"
                    }`}
                  >
                    {state.isGateOpen ? "OPEN" : "CLOSED"}
                  </span>
                </div>
              </div>
            </div>

            {/* Betting Interface */}
            <div className="bg-gray-900/50 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Place Bet</h2>
              {!connected ? (
                <div className="text-center py-8 text-gray-400">
                  <p>Connect your wallet to bet</p>
                </div>
              ) : state.phase !== "betting" || !state.isGateOpen ? (
                <div className="text-center py-8 text-gray-400">
                  <p>Betting is currently closed</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-400 text-sm">
                    Betting will be available when matches are live
                  </p>
                </div>
              )}
            </div>

            {/* Connection Status */}
            <div className="bg-gray-900/50 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Wallet Status</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span
                    className={connected ? "text-green-400" : "text-red-400"}
                  >
                    {connected ? "Connected" : "Not Connected"}
                  </span>
                </div>
                {publicKey && (
                  <div className="pt-2">
                    <p className="text-gray-400 text-xs">Address:</p>
                    <p className="font-mono text-xs text-gray-300 break-all">
                      {publicKey.toString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
