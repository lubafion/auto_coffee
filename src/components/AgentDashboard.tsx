import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Coffee, 
  MapPin, 
  CloudRain, 
  Sun, 
  Navigation, 
  Clock, 
  History, 
  AlertCircle,
  Smartphone,
  CheckCircle2,
  XCircle,
  Thermometer
} from 'lucide-react';
import { 
  AgentInput, 
  AgentOutput, 
  MovementStatus, 
  WeatherStatus, 
  WorkMode, 
  DecisionLogEntry 
} from '../types';
import { decideCoffeeOrder } from '../services/geminiService';

export default function AgentDashboard() {
  const [input, setInput] = useState<AgentInput>({
    currentLocation: { lat: 37.5665, lng: 126.978 },
    currentTime: new Date().toLocaleTimeString(),
    movementStatus: MovementStatus.MOVING,
    weather: WeatherStatus.SUNNY,
    workMode: WorkMode.WORK_FROM_OFFICE,
    todayOrdered: false,
  });

  const [decision, setDecision] = useState<AgentOutput | null>(null);
  const [logs, setLogs] = useState<DecisionLogEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAutoMonitoring, setIsAutoMonitoring] = useState(true);
  const [showNotification, setShowNotification] = useState(false);

  // Auto-trigger logic
  useEffect(() => {
    if (isAutoMonitoring && input.movementStatus === MovementStatus.NEAR_OFFICE && !input.todayOrdered && !isProcessing) {
      handleAutoTrigger();
    }
  }, [input.movementStatus, isAutoMonitoring]);

  const handleAutoTrigger = async () => {
    setIsProcessing(true);
    const output = await decideCoffeeOrder(input);
    
    // Log the auto-check
    const newLog: DecisionLogEntry = {
      timestamp: new Date().toISOString(),
      input: { ...input },
      output: output,
    };
    setLogs(prev => [newLog, ...prev]);

    if (output.should_order) {
      setShowNotification(true);
    }
    
    setDecision(output);
    setIsProcessing(false);
  };

  const runDecision = async () => {
    setIsProcessing(true);
    const output = await decideCoffeeOrder(input);
    setDecision(output);
    
    const newLog: DecisionLogEntry = {
      timestamp: new Date().toISOString(),
      input: { ...input },
      output: output,
    };
    
    setLogs(prev => [newLog, ...prev]);
    
    if (output.should_order) {
      setInput(prev => ({ ...prev, todayOrdered: true }));
    }
    
    setIsProcessing(false);
  };

  const confirmOrder = () => {
    setInput(prev => ({ ...prev, todayOrdered: true }));
    setShowNotification(false);
    // In a real app, this would trigger the actual API call to the coffee shop
  };

  const scenarios = [
    { 
      name: "T1: Weekday Commute", 
      data: { movementStatus: MovementStatus.NEAR_OFFICE, weather: WeatherStatus.SUNNY, workMode: WorkMode.WORK_FROM_OFFICE, todayOrdered: false } 
    },
    { 
      name: "T2: Already Ordered", 
      data: { movementStatus: MovementStatus.NEAR_OFFICE, todayOrdered: true } 
    },
    { 
      name: "T3: Remote Working", 
      data: { workMode: WorkMode.WORK_FROM_HOME } 
    },
    { 
      name: "T4: Already Passed", 
      data: { movementStatus: MovementStatus.PASSED_OFFICE } 
    },
    { 
      name: "T5: Rainy Cold Day", 
      data: { movementStatus: MovementStatus.NEAR_OFFICE, weather: WeatherStatus.COLD, workMode: WorkMode.WORK_FROM_OFFICE, todayOrdered: false } 
    }
  ];

  const applyScenario = (scenarioData: Partial<AgentInput>) => {
    setInput(prev => ({ ...prev, ...scenarioData }));
    setDecision(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      {/* Simulation Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-orange-100 p-2 rounded-xl">
            <Coffee className="text-orange-600 size-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">CoffeePath AI</h1>
            <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">Agent Status: Active</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsAutoMonitoring(!isAutoMonitoring)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${
              isAutoMonitoring ? 'bg-orange-600 text-white shadow-md shadow-orange-200' : 'bg-slate-100 text-slate-400'
            }`}
          >
            {isAutoMonitoring ? 'Monitoring ON' : 'Monitoring OFF'}
          </button>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
            <Clock className="size-3" />
            {input.currentTime}
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-6 space-y-8">
        {/* Scenario Selector */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-500 px-1">Simulation Scenarios</h2>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {scenarios.map((s) => (
              <button
                key={s.name}
                onClick={() => applyScenario(s.data)}
                className="whitespace-nowrap px-4 py-2 bg-white border border-slate-200 rounded-full text-sm font-medium hover:border-orange-300 hover:bg-orange-50 transition-all shadow-sm shrink-0"
              >
                {s.name}
              </button>
            ))}
          </div>
        </section>

        {/* Current Context Card */}
        <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <ContextItem 
              icon={<Navigation className="size-4 text-blue-500" />} 
              label="Location" 
              value={input.movementStatus} 
            />
            <ContextItem 
              icon={input.weather === WeatherStatus.SUNNY ? <Sun className="size-4 text-orange-500" /> : <CloudRain className="size-4 text-indigo-500" />} 
              label="Weather" 
              value={input.weather} 
            />
            <ContextItem 
              icon={<Smartphone className="size-4 text-slate-500" />} 
              label="Routine" 
              value={input.workMode} 
            />
            <ContextItem 
              icon={<AlertCircle className="size-4 text-red-500" />} 
              label="Ordered?" 
              value={input.todayOrdered ? "Yes" : "No"} 
              highlight={input.todayOrdered}
            />
          </div>

          <button
            onClick={runDecision}
            disabled={isProcessing}
            className={`w-full py-4 rounded-2xl font-bold text-white transition-all transform active:scale-95 flex items-center justify-center gap-3 shadow-lg ${
              isProcessing ? 'bg-slate-400' : 'bg-orange-600 hover:bg-orange-700 shadow-orange-200'
            }`}
          >
            {isProcessing ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
            ) : (
              <>
                <Coffee className="size-5" />
                Trigger Agent Decision
              </>
            )}
          </button>
        </div>

        {/* Decision Output */}
        <AnimatePresence mode="wait">
          {decision && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`rounded-3xl p-8 border-2 ${
                decision.should_order 
                  ? 'bg-emerald-50 border-emerald-200' 
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className={`text-xl font-bold ${decision.should_order ? 'text-emerald-900' : 'text-slate-900'}`}>
                    {decision.should_order ? 'Order Executed' : 'Order Bypassed'}
                  </h3>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="flex -space-x-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div 
                          key={i} 
                          className={`size-1.5 rounded-full ${i <= decision.confidence * 5 ? 'bg-slate-400' : 'bg-slate-200'}`} 
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase ml-2">
                       Confidence {Math.round(decision.confidence * 100)}%
                    </span>
                  </div>
                </div>
                {decision.should_order ? (
                  <CheckCircle2 className="text-emerald-500 size-8" />
                ) : (
                  <XCircle className="text-slate-400 size-8" />
                )}
              </div>

              {decision.should_order && (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 mb-4 border border-emerald-100 flex items-center gap-4">
                  <div className="bg-orange-100 p-3 rounded-xl">
                    <Coffee className="text-orange-600 size-6" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Selected Menu</p>
                    <p className="font-bold text-slate-900">{decision.menu}</p>
                  </div>
                </div>
              )}

              <p className="text-sm leading-relaxed text-slate-600 bg-white/40 p-4 rounded-xl italic">
                "{decision.reason}"
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* History / Logs */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-slate-500 flex items-center gap-2">
              <History className="size-4" />
              Decision History
            </h2>
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
              {logs.length} Entries
            </span>
          </div>
          
          <div className="space-y-3">
            {logs.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-slate-300">
                <p className="text-sm text-slate-400">No logs yet. Trigger a decision above.</p>
              </div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className={`size-2 rounded-full ${log.output.should_order ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {log.output.should_order ? `Ordered ${log.output.menu}` : 'Skipped Order'}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString()} • {log.input.movementStatus}
                      </p>
                    </div>
                  </div>
                  {log.output.should_order && (
                    <div className="bg-orange-50 p-2 rounded-lg">
                      <Coffee className="size-4 text-orange-600" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* Smart Notification Modal */}
      <AnimatePresence>
        {showNotification && decision && (
          <div className="fixed inset-0 z-50 flex items-end justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ y: 200, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 200, opacity: 0 }}
              className="w-full max-w-sm bg-white rounded-[32px] overflow-hidden shadow-2xl space-y-6 p-1 border border-slate-200"
            >
              <div className="bg-orange-600 p-8 flex flex-col items-center text-center text-white relative overflow-hidden">
                <motion.div 
                  className="absolute inset-0 bg-white/10"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
                <Coffee className="size-12 mb-4 relative z-10" />
                <h2 className="text-2xl font-bold relative z-10">Time for Coffee?</h2>
                <p className="text-orange-100 text-sm mt-1 relative z-10">I've found the perfect timing & menu.</p>
              </div>

              <div className="px-6 pb-8 pt-2 space-y-6">
                <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-4 border border-slate-100 shadow-sm">
                  <div className="bg-white p-3 rounded-xl shadow-sm">
                    <Thermometer className="text-orange-500 size-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recommended Menu</p>
                    <p className="font-bold text-slate-900">{decision.menu}</p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
                  <AlertCircle className="text-blue-500 size-5 shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800 leading-snug">
                    {decision.reason}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowNotification(false)}
                    className="flex-1 py-4 rounded-2xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    Not Today
                  </button>
                  <button
                    onClick={confirmOrder}
                    className="flex-[2] py-4 rounded-2xl font-bold text-white bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-100 transition-all active:scale-95"
                  >
                    Confirm Order
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ContextItem({ icon, label, value, highlight }: { icon: React.ReactNode, label: string, value: string, highlight?: boolean }) {
  return (
    <div className={`p-4 rounded-2xl border transition-colors ${highlight ? 'bg-orange-50 border-orange-100' : 'bg-slate-50 border-slate-100'}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
      </div>
      <p className={`text-sm font-bold ${highlight ? 'text-orange-700' : 'text-slate-800'}`}>{value}</p>
    </div>
  );
}
