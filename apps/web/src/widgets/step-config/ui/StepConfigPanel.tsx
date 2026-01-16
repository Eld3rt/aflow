'use client';

import { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import { useEditorStore } from '@aflow/web/shared/stores/editor-store';
import { StepNavigation, type Step } from './StepNavigation';
import { SetupStep } from './SetupStep';
import { ScheduleConfigureStep } from './ScheduleConfigureStep';

type ConfigStep = 'setup' | 'configure';

export function StepConfigPanel() {
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId);
  const selectedNodeType = useEditorStore((state) => state.selectedNodeType);
  const trigger = useEditorStore((state) => state.trigger);
  const actions = useEditorStore((state) => state.actions);
  const updateAction = useEditorStore((state) => state.updateAction);
  const setTrigger = useEditorStore((state) => state.setTrigger);
  const closeConfigPanel = useEditorStore((state) => state.closeConfigPanel);

  const [currentStep, setCurrentStep] = useState<ConfigStep>('setup');
  const [selectedType, setSelectedType] = useState<string>('');

  const selectedNode =
    selectedNodeType === 'trigger'
      ? trigger
      : actions.find((a) => a.id === selectedNodeId);

  // Initialize form state from existing node
  useEffect(() => {
    if (selectedNode) {
      setSelectedType(selectedNode.type);
      // Extract subtype from config if it exists (for schedule triggers)
      if (selectedNode.type === 'cron' && selectedNode.config.subtype) {
      }
      // If node is already configured, go to configure step
      if (selectedNode.type && Object.keys(selectedNode.config).length > 0) {
        setCurrentStep('configure');
      } else {
        setCurrentStep('setup');
      }
    } else {
      // New node - reset to setup
      setSelectedType('');
      setCurrentStep('setup');
    }
  }, [selectedNode]);

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
  };

  const handleSetupContinue = () => {
    setCurrentStep('configure');
  };

  const handleConfigureSave = (config: Record<string, unknown>) => {
    if (!selectedNodeId || !selectedNodeType) return;

    const finalConfig = {
      ...config,
    };

    if (selectedNodeType === 'trigger') {
      setTrigger({
        id: trigger?.id || `trigger-${Date.now()}`,
        type: selectedType,
        config: finalConfig,
      });
    } else if (selectedNodeType === 'action') {
      updateAction(selectedNodeId, {
        type: selectedType,
        config: finalConfig,
      });
    }

    // Don't close panel - let user see the saved state
    // User can close manually if needed
  };

  const getNodeTitle = () => {
    if (!selectedNodeType) return 'Configuration';
    if (selectedNodeType === 'trigger') {
      if (selectedType === 'cron') {
        return '1. Cron Trigger';
      }
      return '1. Trigger';
    }
    return 'Action';
  };

  const getNodeIcon = () => {
    if (selectedType === 'cron' || selectedNode?.type === 'cron') {
      return <Calendar className="h-5 w-5 text-neutral-600" />;
    }
    return null;
  };

  // Check if configure step is completed (has saved config)
  const isConfigureCompleted = () => {
    if (!selectedNode) return false;
    // For cron triggers, check if cronExpression exists
    if (selectedNode.type === 'cron') {
      return !!selectedNode.config.cronExpression;
    }
    // For other types, check if config has meaningful data
    return Object.keys(selectedNode.config).length > 0;
  };

  const configureCompleted = isConfigureCompleted();
  const setupCompleted = currentStep === 'configure' || configureCompleted;

  const steps: Step[] = [
    {
      id: 'setup',
      label: 'Setup',
      status:
        currentStep === 'setup'
          ? 'active'
          : setupCompleted
            ? 'completed'
            : 'pending',
    },
    {
      id: 'configure',
      label: 'Configure',
      status:
        currentStep === 'configure'
          ? 'active'
          : configureCompleted
            ? 'completed'
            : 'pending',
    },
  ];

  const handleStepClick = (stepId: string) => {
    if (stepId === 'setup' && currentStep === 'configure') {
      // Allow going back to setup
      setCurrentStep('setup');
    } else if (stepId === 'configure' && currentStep === 'setup') {
      setCurrentStep('configure');
    }
  };

  if (!selectedNodeId || !selectedNodeType) {
    return null;
  }

  return (
    <div className="fixed right-0 top-0 h-full w-96 border-l border-gray-200 bg-white shadow-xl">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-2">
            {getNodeIcon() && (
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-neutral-100">
                {getNodeIcon()}
              </div>
            )}
            <h2 className="text-lg font-semibold text-gray-900">
              {getNodeTitle()}
            </h2>
          </div>
          <button
            onClick={closeConfigPanel}
            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Navigation */}
        <StepNavigation steps={steps} onStepClick={handleStepClick} />

        {/* Step Content */}
        <div className="flex-1 flex-col overflow-hidden">
          {currentStep === 'setup' && (
            <SetupStep
              nodeType={selectedNodeType}
              selectedType={selectedType}
              onTypeChange={handleTypeChange}
              onContinue={handleSetupContinue}
            />
          )}

          {currentStep === 'configure' && selectedType === 'cron' && (
            <ScheduleConfigureStep
              initialValues={
                selectedNode?.type === 'cron' &&
                selectedNode.config.scheduleConfig
                  ? (selectedNode.config.scheduleConfig as Partial<{
                      frequencyType: 'hourly' | 'daily' | 'weekly' | 'monthly';
                      interval: number;
                      startDate: string;
                      timeOfDay: string;
                    }>)
                  : undefined
              }
              onSave={handleConfigureSave}
            />
          )}

          {/* Placeholder for other trigger/action types */}
          {currentStep === 'configure' && selectedType !== 'cron' && (
            <div className="flex flex-1 items-center justify-center p-6">
              <p className="text-sm text-gray-500">
                Configuration for {selectedType} is not yet implemented.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
