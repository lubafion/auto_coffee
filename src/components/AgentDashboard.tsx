import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Coffee, 
  CloudRain, 
  Sun, 
  Navigation, 
  Clock, 
  History, 
  AlertCircle,
  Smartphone,
  CheckCircle2,
  XCircle,
  Thermometer,
  Settings,
  ChevronRight,
  Droplets,
  Flame,
  Shuffle,
} from 'lucide-react';
import { 
  AgentInput, 
  AgentOutput, 
  MovementStatus, 
  WeatherStatus, 
  WorkMode, 
  DecisionLogEntry,
  UserPreferences,
  DrinkTemperature,
  DrinkCategory,
  SugarLevel,
} from '../types';
import { decideCoffeeOrder } from '../services/geminiService';

const PREFS_KEY = 'coffeepath.userPreferences';
const POPUP_COOLDOWN_KEY = 'coffeepath.popupCooldown';

// 시간대: morning(7~12시) | afternoon(12~18시) | evening(18~24시)
// 새벽(0~7시)은 null → 팝업 비활성
type TimeSlot = 'morning' | 'afternoon' | 'evening';

function getTimeSlot(date: Date = new Date()): TimeSlot | null {
  const h = date.getHours();
  if (h < 7) return null;   // 새벽(0~7시) — 팝업 비활성
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';          // 18~23시
}

// 오늘 날짜 + 시간대 키 (예: "2026-04-28-morning")
// 시간대가 null(범위 밖)이면 null 반환
function getCooldownKey(): string | null {
  const d = new Date();
  const slot = getTimeSlot(d);
  if (!slot) return null;
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `${dateStr}-${slot}`;
}

function hasShownPopupThisSlot(): boolean {
  try {
    const key = getCooldownKey();
    if (!key) return true; // 범위 밖 시간대 → 팝업 차단
    const raw = localStorage.getItem(POPUP_COOLDOWN_KEY);
    return raw === key;
  } catch {
    return false;
  }
}

function markPopupShown(): void {
  const key = getCooldownKey();
  if (key) localStorage.setItem(POPUP_COOLDOWN_KEY, key);
}

function loadPreferences(): UserPreferences | null {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? (JSON.parse(raw) as UserPreferences) : null;
  } catch {
    return null;
  }
}

function savePreferences(prefs: UserPreferences): void {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

// ─── Onboarding / Preferences Setup Screen ───────────────────────────────────

interface PreferencesSetupProps {
  initial?: UserPreferences;
  onSave: (prefs: UserPreferences) => void;
  isEdit?: boolean;
}

function PreferencesSetup({ initial, onSave, isEdit = false }: PreferencesSetupProps) {
  const [temperature, setTemperature] = useState<DrinkTemperature>(initial?.temperature ?? 'any');
  const [category, setCategory] = useState<DrinkCategory>(initial?.category ?? 'any');
  const [sugarLevel, setSugarLevel] = useState<SugarLevel>(initial?.sugarLevel ?? 'normal');
  const [customNote, setCustomNote] = useState(initial?.customNote ?? '');

  const handleSave = () => {
    onSave({ temperature, category, sugarLevel, customNote });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-orange-600 px-6 pt-12 pb-10 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-white/20 p-2.5 rounded-2xl">
            <Coffee className="size-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">CoffeePath AI</h1>
            <p className="text-orange-100 text-sm">
              {isEdit ? '음료 기호 수정' : '처음 오셨군요! 음료 기호를 알려주세요'}
            </p>
          </div>
        </div>
        {!isEdit && (
          <p className="text-orange-100 text-sm leading-relaxed">
            설정한 기호를 바탕으로 AI가 날씨와 상황에 맞는 음료를 추천해드려요.
          </p>
        )}
      </div>

      <div className="flex-1 px-6 py-8 space-y-8 max-w-md mx-auto w-full">

        {/* Temperature */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">온도 선호</h2>
          <div className="grid grid-cols-3 gap-3">
            {([
              { value: 'iced', label: '아이스', icon: <Droplets className="size-5" /> },
              { value: 'hot',  label: '핫',    icon: <Flame className="size-5" /> },
              { value: 'any',  label: '상관없음', icon: <Shuffle className="size-5" /> },
            ] as { value: DrinkTemperature; label: string; icon: React.ReactNode }[]).map(opt => (
              <button
                key={opt.value}
                onClick={() => setTemperature(opt.value)}
                className={`flex flex-col items-center gap-2 py-4 rounded-2xl border-2 font-semibold text-sm transition-all ${
                  temperature === opt.value
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                }`}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* Category */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">음료 종류</h2>
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: 'americano',  label: '아메리카노' },
              { value: 'latte',      label: '라떼' },
              { value: 'cappuccino', label: '카푸치노' },
              { value: 'mocha',      label: '모카' },
              { value: 'tea',        label: '티' },
              { value: 'any',        label: '상관없음' },
            ] as { value: DrinkCategory; label: string }[]).map(opt => (
              <button
                key={opt.value}
                onClick={() => setCategory(opt.value)}
                className={`py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                  category === opt.value
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* Sugar */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">당도</h2>
          <div className="grid grid-cols-3 gap-3">
            {([
              { value: 'none',   label: '무당' },
              { value: 'light',  label: '약하게' },
              { value: 'normal', label: '보통' },
            ] as { value: SugarLevel; label: string }[]).map(opt => (
              <button
                key={opt.value}
                onClick={() => setSugarLevel(opt.value)}
                className={`py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                  sugarLevel === opt.value
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* Custom Note */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
            추가 요청 <span className="text-slate-400 font-normal normal-case">(선택)</span>
          </h2>
          <input
            type="text"
            value={customNote}
            onChange={e => setCustomNote(e.target.value)}
            placeholder="예: 디카페인, 오트밀크, 샷 추가"
            className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-400 transition-colors"
          />
        </section>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full py-4 rounded-2xl font-bold text-white bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-200 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          {isEdit ? '저장하기' : '시작하기'}
          <ChevronRight className="size-5" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function AgentDashboard() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [showPrefsEdit, setShowPrefsEdit] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

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
  // 이미 주문한 상태에서 팝업이 뜬 경우 재주문 여부를 구분하기 위한 플래그
  const [isReorder, setIsReorder] = useState(false);

  // 첫 실행 시 localStorage에서 기호 로드
  useEffect(() => {
    const saved = loadPreferences();
    setPreferences(saved);
    setPrefsLoaded(true);
  }, []);

  // 기호가 바뀌면 input에도 반영
  useEffect(() => {
    if (preferences) {
      setInput(prev => ({ ...prev, userPreferences: preferences }));
    }
  }, [preferences]);

  // Auto-trigger logic
  // todayOrdered 여부와 무관하게 Near Office 진입 시 트리거
  // 단, 같은 시간대(아침/점심/저녁)에 이미 팝업을 띄웠으면 스킵
  useEffect(() => {
    if (isAutoMonitoring && input.movementStatus === MovementStatus.NEAR_OFFICE && !isProcessing) {
      if (!hasShownPopupThisSlot()) {
        handleAutoTrigger();
      }
    }
  }, [input.movementStatus, isAutoMonitoring]);

  const handleSavePreferences = (prefs: UserPreferences) => {
    savePreferences(prefs);
    setPreferences(prefs);
    setShowPrefsEdit(false);
  };

  const handleAutoTrigger = async () => {
    setIsProcessing(true);
    const output = await decideCoffeeOrder(input);
    const newLog: DecisionLogEntry = {
      timestamp: new Date().toISOString(),
      input: { ...input },
      output,
    };
    setLogs(prev => [newLog, ...prev]);
    setDecision(output);
    setIsProcessing(false);

    // should_order일 때만 팝업 — 쿨다운 기록 후 표시
    if (output.should_order) {
      markPopupShown();
      setIsReorder(input.todayOrdered); // 이미 주문한 상태면 재주문 플래그
      setShowNotification(true);
    }
  };

  const runDecision = async () => {
    setIsProcessing(true);
    const output = await decideCoffeeOrder(input);
    setDecision(output);
    const newLog: DecisionLogEntry = {
      timestamp: new Date().toISOString(),
      input: { ...input },
      output,
    };
    setLogs(prev => [newLog, ...prev]);
    if (output.should_order) {
      setIsReorder(input.todayOrdered);
      setShowNotification(true);
    }
    setIsProcessing(false);
  };

  const confirmOrder = () => {
    setInput(prev => ({ ...prev, todayOrdered: true }));
    setShowNotification(false);
    setIsReorder(false);
  };

  const dismissNotification = () => {
    setShowNotification(false);
    setIsReorder(false);
  };

  const scenarios = [
    { name: "T1: Weekday Commute",  data: { movementStatus: MovementStatus.NEAR_OFFICE, weather: WeatherStatus.SUNNY, workMode: WorkMode.WORK_FROM_OFFICE, todayOrdered: false } },
    { name: "T2: Already Ordered",  data: { movementStatus: MovementStatus.NEAR_OFFICE, todayOrdered: true } },
    { name: "T3: Remote Working",   data: { workMode: WorkMode.WORK_FROM_HOME } },
    { name: "T4: Already Passed",   data: { movementStatus: MovementStatus.PASSED_OFFICE } },
    { name: "T5: Rainy Cold Day",   data: { movementStatus: MovementStatus.NEAR_OFFICE, weather: WeatherStatus.COLD, workMode: WorkMode.WORK_FROM_OFFICE, todayOrdered: false } },
  ];

  const applyScenario = (scenarioData: Partial<AgentInput>) => {
    setInput(prev => ({ ...prev, ...scenarioData }));
    setDecision(null);
  };

  // 기호 요약 텍스트
  const prefsSummary = preferences
    ? [
        preferences.temperature !== 'any' ? (preferences.temperature === 'iced' ? '아이스' : '핫') : null,
        preferences.category !== 'any' ? preferences.category : null,
        preferences.sugarLevel !== 'normal' ? (preferences.sugarLevel === 'none' ? '무당' : '약당') : null,
        preferences.customNote || null,
      ].filter(Boolean).join(' · ') || '기본 설정'
    : '';

  // 로드 전 빈 화면
  if (!prefsLoaded) return null;

  // 첫 실행: 온보딩
  if (!preferences) {
    return <PreferencesSetup onSave={handleSavePreferences} />;
  }

  // 기호 수정 화면
  if (showPrefsEdit) {
    return <PreferencesSetup initial={preferences} onSave={handleSavePreferences} isEdit />;
  }

  // ─── 메인 대시보드 ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      {/* Header */}
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
        <div className="flex items-center gap-2">
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

        {/* 음료 기호 배너 */}
        <button
          onClick={() => setShowPrefsEdit(true)}
          className="w-full flex items-center justify-between bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm hover:border-orange-300 hover:bg-orange-50 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-2 rounded-xl group-hover:bg-orange-200 transition-colors">
              <Coffee className="size-4 text-orange-600" />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">내 음료 기호</p>
              <p className="text-sm font-semibold text-slate-800">{prefsSummary}</p>
            </div>
          </div>
          <Settings className="size-4 text-slate-400 group-hover:text-orange-500 transition-colors" />
        </button>

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

        {/* Context Card */}
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
                decision.should_order ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
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

        {/* History */}
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

      {/* Notification Modal */}
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
                <h2 className="text-2xl font-bold relative z-10">
                  {isReorder ? '한 잔 더 어떠세요?' : 'Time for Coffee?'}
                </h2>
                <p className="text-orange-100 text-sm mt-1 relative z-10">
                  {isReorder
                    ? '오늘 이미 주문하셨어요. 한 잔 더 시킬까요?'
                    : "I've found the perfect timing & menu."}
                </p>
              </div>

              <div className="px-6 pb-8 pt-2 space-y-6">
                {/* 재주문 안내 배너 */}
                {isReorder && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-2">
                    <AlertCircle className="size-4 text-amber-500 shrink-0" />
                    <p className="text-xs text-amber-700 font-medium">오늘 이미 주문 내역이 있습니다</p>
                  </div>
                )}

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
                  <p className="text-sm text-blue-800 leading-snug">{decision.reason}</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={dismissNotification}
                    className="flex-1 py-4 rounded-2xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    괜찮아요
                  </button>
                  <button
                    onClick={confirmOrder}
                    className="flex-[2] py-4 rounded-2xl font-bold text-white bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-100 transition-all active:scale-95"
                  >
                    {isReorder ? '한 잔 더 주문' : '주문하기'}
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

function ContextItem({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
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
