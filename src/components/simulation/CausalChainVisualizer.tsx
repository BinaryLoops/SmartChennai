"use client";

import { useSocket } from "@/hooks/useSocket";
import { ArrowDown, AlertTriangle, Zap, CloudRain, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function CausalChainVisualizer() {
  const { scenarioState, cityEvents } = useSocket();

  if (!scenarioState || scenarioState.status === "idle") {
    return (
      <div className="bg-white dark:bg-[#1a1b1e] rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-center min-h-[400px]">
        <div className="text-center text-gray-400">
          <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No active scenarios.</p>
          <p className="text-sm">Start a scenario to view causal propagation.</p>
        </div>
      </div>
    );
  }

  // Filter events related to the current scenario
  // In a real app we might match exactly, but here we just show recent high-severity events as downstream effects
  const recentEvents = cityEvents.slice(0, 3);

  return (
    <div className="bg-white dark:bg-[#1a1b1e] rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 h-full flex flex-col">
      <h3 className="font-semibold mb-6 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-orange-500" />
        Causal Propagation Chain
      </h3>

      <div className="flex-1 flex flex-col items-center justify-start pt-4 space-y-2">
        {/* Origin Node */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 dark:bg-red-900/30 border-2 border-red-500 rounded-lg px-6 py-3 w-64 text-center shadow-sm relative z-10"
        >
          <div className="text-xs text-red-600 dark:text-red-400 font-bold uppercase tracking-wider mb-1">Trigger</div>
          <div className="font-semibold text-gray-900 dark:text-gray-100">{scenarioState.activeScenarioId.replace(/_/g, " ")}</div>
        </motion.div>

        {/* Arrow */}
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 32, opacity: 1 }}
          className="flex justify-center"
        >
          <ArrowDown className="w-5 h-8 text-gray-300 dark:text-gray-600 animate-pulse" />
        </motion.div>

        {/* Primary Effect Nodes (Simulated based on modifiers) */}
        <div className="flex flex-wrap justify-center gap-4 relative z-10 w-full max-w-lg">
          <AnimatePresence>
            {Math.abs(scenarioState.currentModifiers.trafficFriction) > 0.1 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="bg-orange-50 dark:bg-orange-900/30 border border-orange-300 rounded-lg p-3 text-center w-36 shadow-sm"
              >
                <div className="text-xs text-orange-600 font-medium">Traffic Impact</div>
                <div className="text-lg font-bold text-orange-700">+{Math.round(scenarioState.currentModifiers.trafficFriction * 100)}%</div>
              </motion.div>
            )}
            
            {Math.abs(scenarioState.currentModifiers.floodRiskMultiplier) > 0.1 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="bg-blue-50 dark:bg-blue-900/30 border border-blue-300 rounded-lg p-3 text-center w-36 shadow-sm"
              >
                <div className="text-xs text-blue-600 font-medium">Flood Risk</div>
                <div className="text-lg font-bold text-blue-700">+{Math.round(scenarioState.currentModifiers.floodRiskMultiplier * 100)}%</div>
              </motion.div>
            )}

            {scenarioState.currentModifiers.powerGridAvailability < 0.9 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 rounded-lg p-3 text-center w-36 shadow-sm"
              >
                <div className="text-xs text-yellow-600 font-medium">Grid Degraded</div>
                <div className="text-lg font-bold text-yellow-700">-{Math.round((1 - scenarioState.currentModifiers.powerGridAvailability) * 100)}%</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Secondary Downstream Effects */}
        {recentEvents.length > 0 && (
           <>
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 32, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex justify-center"
            >
              <ArrowDown className="w-5 h-8 text-gray-300 dark:text-gray-600 animate-pulse" />
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="w-full max-w-md bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-dashed border-gray-300 dark:border-gray-700 relative z-10"
            >
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 text-center">Downstream Anomalies</div>
              <div className="space-y-2">
                {recentEvents.map(evt => (
                  <div key={evt.id} className="text-sm bg-white dark:bg-gray-800 p-2 rounded shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <span className="font-medium text-gray-800 dark:text-gray-200">{evt.description}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600">{evt.type}</span>
                  </div>
                ))}
              </div>
            </motion.div>
           </>
        )}
      </div>
    </div>
  );
}
