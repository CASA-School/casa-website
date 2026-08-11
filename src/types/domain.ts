export type ScheduleDay =
  | 'MON'
  | 'TUE'
  | 'WED'
  | 'THU'
  | 'FRI'
  | 'SAT'
  | 'SUN';

export type ScheduleBlock = {
  day: ScheduleDay;
  start: string;
  end: string;
  timezone: string;
};

export type ApiResponse<T> = {
  data: T | null;
  error: {
    code: string;
    message: string;
  } | null;
};
