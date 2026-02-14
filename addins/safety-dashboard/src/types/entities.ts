export interface IdRef {
  id: string;
}

export interface Rule {
  id: string;
  name?: string;
  comment?: string;
  baseType?: string;
}

export interface ExceptionEvent {
  id: string;
  activeFrom: string;
  activeTo: string;
  duration?: number;
  distance?: number;
  device: IdRef;
  driver?: IdRef;
  rule: IdRef;
  state?: number;
  exceptionCount?: number;
}

export interface Device {
  id: string;
  name?: string;
  serialNumber?: string;
  vin?: string;
  licensePlate?: string;
  groups?: IdRef[];
}

export interface User {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  isDriver?: boolean;
}

export interface Group {
  id: string;
  name?: string;
}
