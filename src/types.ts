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

export interface AgentInput {
  currentLocation: { lat: number; lng: number };
  currentTime: string;
  movementStatus: MovementStatus;
  weather: WeatherStatus;
  workMode: WorkMode;
  todayOrdered: boolean;
  lastOrderTime?: string;
  lastOrderMenu?: string;
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
