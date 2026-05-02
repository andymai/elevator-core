export type { HostToWorker, InitPayload, TickResultPayload, WorkerToHost } from "./protocol";
export { WorkerSim, createWorkerSim, type WorkerSimOptions } from "./worker-sim";
export { loadMonaco, mountQuestEditor, type EditorMountOptions, type QuestEditor } from "./editor";
export {
  STAGES,
  stageById,
  type Baseline,
  type GradeInputs,
  type PassFn,
  type Stage,
  type StarFn,
  type UnlockedApi,
} from "./stages";
export { runStage, type StageResult, type RunStageOptions, type StarCount } from "./stage-runner";
export {
  bootQuestPane,
  hideQuestPane,
  renderStage,
  showQuestPane,
  wireQuestPane,
  type QuestPaneHandles,
} from "./quest-pane";
export {
  hideResults,
  showResults,
  wireResultsModal,
  type ResultsModalHandles,
} from "./results-modal";
export { API_REFERENCE, apiEntry, unlockedEntries, type ApiEntry } from "./api-reference";
