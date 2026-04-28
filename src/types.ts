export enum WorkMode {
  WORK_FROM_OFFICE = 'Office',
  WORK_FROM_HOME = 'Remote',
  OUT_OF_OFFICE = 'OOO',
}

export enum WeatherStatus {
  SUNNY = 'Sunny',
  RAINY = 'Rainy',
  COLD = 'Cold',
  CLOUDY = 'Cloudy',
}

export enum MovementStatus {
  MOVING = 'Moving',
  STATIONARY = 'Stationary',
  NEAR_OFFICE = 'Near Office',
  PASSED_OFFICE = 'Passed Office',
}

export type DrinkTemperature = 'iced' | 'hot' | 'any';
export type DrinkCategory = 'americano' | 'latte' | 'cappuccino' | 'mocha' | 'tea' | 'any';
export type SugarLevel = 'none' | 'light' | 'normal';

export interface UserPreferences {
  temperature: DrinkTemperature;
  category: DrinkCategory;
  sugarLevel: SugarLevel;
  customNote: string; // 자유 입력 (예: "디카페인", "오트밀크")
}

export interface AgentInput {
  currentLocation: { lat: number; lng: number };
  currentTime: string;
  movementStatus: MovementStatus;
  weather: WeatherStatus;
  workMode: WorkMode;
  todayOrdered: boolean;
  lastOrderTime?: string;
  lastOrderMenu?: string;
  userPreferences?: UserPreferences;
}

export interface AgentOutput {
  should_order: boolean;
  menu: string;
  confidence: number;
  reason: string;
}

export interface DecisionLogEntry {
  timestamp: string;
  input: AgentInput;
  output: AgentOutput;
}
