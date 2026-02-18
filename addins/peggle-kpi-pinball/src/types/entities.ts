export interface IdRef {
  id: string;
}

export interface Device {
  id: string;
  name?: string;
  serialNumber?: string;
  vin?: string;
  licensePlate?: string;
  groups?: IdRef[];
}

export interface DeviceStatusInfo {
  id?: string;
  device: IdRef;
  dateTime?: string;
  latitude?: number;
  longitude?: number;
  speed?: number;
  bearing?: number;
  isDriving?: boolean;
  isDeviceCommunicating?: boolean;
}

export interface Trip {
  id: string;
  device: IdRef;
  driver?: IdRef;
  start: string;
  stop: string;
  distance?: number;
  drivingDuration?: { totalSeconds?: number };
  idlingDuration?: { totalSeconds?: number };
  averageSpeed?: number;
  maximumSpeed?: number;
}

export interface ExceptionEvent {
  id: string;
  activeFrom: string;
  activeTo: string;
  duration?: number;
  device: IdRef;
  driver?: IdRef;
  rule: IdRef;
  details?: { maxSpeed?: number; speedLimit?: number };
}

export interface LogRecord {
  id: string;
  device: IdRef;
  dateTime: string;
  latitude?: number;
  longitude?: number;
  speed?: number;
}
