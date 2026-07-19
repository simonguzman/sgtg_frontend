import { AppEventType } from "../enums/app-event-type.enum";

export interface AppEvent {
  type: AppEventType;
  payload: any;
  targetUserIds?: string[];
}
