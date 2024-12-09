import { ValidateItem } from "./steps/ValidateItem";
import { ScanDestination } from "./steps/ScanDestination";
import { CompleteMove } from "./steps/CompleteMove";

export const moveWorkflowSteps = [
  {
    id: "validate-item",
    title: "Scan Item",
    component: ValidateItem,
  },
  {
    id: "scan-destination",
    title: "Scan Destination",
    component: ScanDestination,
  },
  {
    id: "complete-move",
    title: "Complete Move",
    component: CompleteMove,
  },
] as const;

export type MoveWorkflowStep = typeof moveWorkflowSteps[number]["id"]; 