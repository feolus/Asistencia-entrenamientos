export enum AttendanceStatus {
  Present = 0,
  Absent = 1,
  Injured = 2,
}

export interface Player {
  id: number;
  name: string;
  attendance: (AttendanceStatus | null)[];
}
