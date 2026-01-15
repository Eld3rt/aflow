import { create } from 'zustand';
import type { WorkflowResponse } from '../types/workflows';

export interface EditorAction {
  id: string;
  type: string;
  config: Record<string, unknown>;
  order: number;
}

export interface EditorTrigger {
  id: string;
  type: string;
  config: Record<string, unknown>;
}

export interface EditorState {
  workflow: {
    id: string | null;
    name: string;
    status: string;
    steps: Array<{
      id: string;
      type: string;
      config: Record<string, unknown>;
      order: number;
      createdAt: string;
    }>;
  } | null;
  trigger: EditorTrigger | null;
  actions: EditorAction[];
  selectedNodeId: string | null;
  selectedNodeType: 'trigger' | 'action' | null;
  isConfigPanelOpen: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface EditorActions {
  loadWorkflow: (workflow: WorkflowResponse) => void;
  setWorkflowName: (name: string) => void;
  setTrigger: (trigger: EditorTrigger) => void;
  addAction: () => void;
  removeAction: (actionId: string) => void;
  updateAction: (actionId: string, updates: Partial<EditorAction>) => void;
  reorderActions: (startIndex: number, endIndex: number) => void;
  selectNode: (nodeId: string, nodeType: 'trigger' | 'action') => void;
  closeConfigPanel: () => void;
  reset: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const initialState: EditorState = {
  workflow: null,
  trigger: null,
  actions: [],
  selectedNodeId: null,
  selectedNodeType: null,
  isConfigPanelOpen: false,
  isLoading: false,
  error: null,
};

export const useEditorStore = create<EditorState & EditorActions>((set) => ({
  ...initialState,

  loadWorkflow: (workflow) => {
    set({
      workflow: {
        id: workflow.id,
        name: workflow.name,
        status: workflow.status,
        steps: workflow.steps,
      },
      trigger: workflow.trigger
        ? {
            id: workflow.trigger.id,
            type: workflow.trigger.type,
            config: workflow.trigger.config,
          }
        : null,
      actions: workflow.steps.map((step) => ({
        id: step.id,
        type: step.type,
        config: step.config,
        order: step.order,
      })),
      selectedNodeId: null,
      selectedNodeType: null,
      isConfigPanelOpen: false,
      error: null,
    });
  },

  setWorkflowName: (name) => {
    set((state) => ({
      workflow: state.workflow
        ? { ...state.workflow, name }
        : { id: null, name, status: 'draft', steps: [] },
    }));
  },

  setTrigger: (trigger) => {
    set({ trigger });
  },

  addAction: () => {
    set((state) => {
      const newOrder =
        state.actions.length > 0
          ? Math.max(...state.actions.map((a) => a.order)) + 1
          : 0;

      const newAction: EditorAction = {
        id: `action-${Date.now()}`,
        type: 'http',
        config: {},
        order: newOrder,
      };

      return {
        actions: [...state.actions, newAction],
      };
    });
  },

  removeAction: (actionId) => {
    set((state) => ({
      actions: state.actions.filter((action) => action.id !== actionId),
      selectedNodeId:
        state.selectedNodeId === actionId ? null : state.selectedNodeId,
      selectedNodeType:
        state.selectedNodeId === actionId ? null : state.selectedNodeType,
      isConfigPanelOpen:
        state.selectedNodeId === actionId ? false : state.isConfigPanelOpen,
    }));
  },

  updateAction: (actionId, updates) => {
    set((state) => ({
      actions: state.actions.map((action) =>
        action.id === actionId ? { ...action, ...updates } : action,
      ),
    }));
  },

  reorderActions: (startIndex, endIndex) => {
    set((state) => {
      const sortedActions = [...state.actions].sort(
        (a, b) => a.order - b.order,
      );
      const [removed] = sortedActions.splice(startIndex, 1);
      
      if (!removed) {
        return state; // No action to move
      }
      
      sortedActions.splice(endIndex, 0, removed);

      // Reassign order values
      const reordered = sortedActions.map((action, index) => ({
        ...action,
        order: index,
      }));

      return { actions: reordered };
    });
  },

  selectNode: (nodeId, nodeType) => {
    set({
      selectedNodeId: nodeId,
      selectedNodeType: nodeType,
      isConfigPanelOpen: true,
    });
  },

  closeConfigPanel: () => {
    set({
      selectedNodeId: null,
      selectedNodeType: null,
      isConfigPanelOpen: false,
    });
  },

  reset: () => {
    set(initialState);
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  setError: (error) => {
    set({ error });
  },
}));
