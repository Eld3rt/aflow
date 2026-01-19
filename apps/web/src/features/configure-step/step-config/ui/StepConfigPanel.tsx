'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Database } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@clerk/nextjs';
import { useEditorStore } from '@aflow/web/shared/stores/editor-store';
import { StepNavigation, type Step } from './StepNavigation';
import { SetupStep } from './SetupStep';
import { ScheduleConfigureStep } from './ScheduleConfigureStep';
import { EmailConfigureStep } from './EmailConfigureStep';
import { FormatterSetupStep } from './FormatterSetupStep';
import { FormatterConfigureStep } from './FormatterConfigureStep';
import { HttpConfigureStep } from './HttpConfigureStep';
import { DatabaseSetupStep } from './DatabaseSetupStep';
import { DatabaseConfigureStep } from './DatabaseConfigureStep';
import { TelegramConfigureStep } from './TelegramConfigureStep';
import { EmailTriggerConfigureStep } from './EmailTriggerConfigureStep';
import { WebhookTriggerConfigureStep } from './WebhookTriggerConfigureStep';
import { DraggableAvailableDataPanel } from './DraggableAvailableDataPanel';
import { useTemplateInsertion } from '../hooks/useTemplateInsertion';

type ConfigStep = 'setup' | 'configure';

// Email generation utility
const EMAIL_DOMAIN = process.env.NEXT_PUBLIC_INBOUND_EMAIL_DOMAIN;
const EMAIL_PREFIX = 'notify';

function generateBase36(length: number): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function generateEmailAddress(): string {
  const randomPart = generateBase36(Math.random() < 0.5 ? 3 : 4);
  return `${EMAIL_PREFIX}-${randomPart}@${EMAIL_DOMAIN}`;
}

async function checkEmailUniqueness(
  email: string,
  token: string | null,
): Promise<boolean> {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/workflows`, {
      headers,
    });

    if (!response.ok) {
      // If we can't check, assume it's unique (backend will validate on save)
      return true;
    }

    const workflows = (await response.json()) as Array<{
      trigger: {
        type: string;
        config: Record<string, unknown>;
      } | null;
    }>;

    // Check if any workflow has an email trigger with this inboundEmail
    return !workflows.some(
      (workflow) =>
        workflow.trigger?.type === 'email' &&
        (workflow.trigger.config as Record<string, unknown>)?.inboundEmail ===
          email,
    );
  } catch (error) {
    console.error('Error checking email uniqueness:', error);
    // If check fails, assume it's unique (backend will validate on save)
    return true;
  }
}

async function generateUniqueEmail(
  token: string | null,
  maxAttempts = 10,
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const email = generateEmailAddress();
    const isUnique = await checkEmailUniqueness(email, token);
    if (isUnique) {
      return email;
    }
  }
  // If we can't generate a unique email after max attempts, return a generated one anyway
  // Backend will handle validation on save
  return generateEmailAddress();
}

export function StepConfigPanel() {
  const { getToken } = useAuth();
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId);
  const selectedNodeType = useEditorStore((state) => state.selectedNodeType);
  const trigger = useEditorStore((state) => state.trigger);
  const actions = useEditorStore((state) => state.actions);
  const updateAction = useEditorStore((state) => state.updateAction);
  const setTrigger = useEditorStore((state) => state.setTrigger);
  const closeConfigPanel = useEditorStore((state) => state.closeConfigPanel);

  const [currentStep, setCurrentStep] = useState<ConfigStep>('setup');
  const [selectedType, setSelectedType] = useState<string>('');
  const [formatterType, setFormatterType] = useState<string>('');
  const [transformType, setTransformType] = useState<string>('');
  const [databaseType, setDatabaseType] = useState<string>('');
  const [inboundEmail, setInboundEmail] = useState<string>('');
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [webhookTriggerId, setWebhookTriggerId] = useState<string>('');
  
  // Available Data Panel state
  const [isAvailableDataPanelOpen, setIsAvailableDataPanelOpen] = useState(false);
  const [availableDataPanelPosition, setAvailableDataPanelPosition] = useState({ x: 100, y: 100 });
  const configPanelRef = useRef<HTMLDivElement>(null);
  
  // Track focused input/textarea for template insertion
  const lastFocusedElementRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const { insertTemplate } = useTemplateInsertion();

  // Shared handler for template insertion from the draggable panel
  const handleAvailableDataFieldClick = useCallback((path: string) => {
    // Try to use tracked element, or find active element in the form
    let targetElement = lastFocusedElementRef.current || document.activeElement;
    
    // If no tracked element, try to find the last input/textarea in the config panel
    if (!targetElement || (!(targetElement instanceof HTMLInputElement) && !(targetElement instanceof HTMLTextAreaElement))) {
      const configPanel = document.querySelector('[data-config-panel]');
      if (configPanel) {
        const inputs = configPanel.querySelectorAll('input, textarea');
        if (inputs.length > 0) {
          targetElement = inputs[inputs.length - 1] as HTMLInputElement | HTMLTextAreaElement;
        }
      }
    }
    
    if (
      targetElement instanceof HTMLInputElement ||
      targetElement instanceof HTMLTextAreaElement
    ) {
      insertTemplate(targetElement, path);
      // Re-focus the input after insertion
      targetElement.focus();
    }
  }, [insertTemplate]);

  // Track focus changes on inputs/textareas in the panel
  useEffect(() => {
    const configPanel = document.querySelector('[data-config-panel]');
    if (!configPanel) return;

    const handleFocus = (e: Event) => {
      const target = e.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      ) {
        lastFocusedElementRef.current = target;
      }
    };

    configPanel.addEventListener('focusin', handleFocus);
    return () => {
      configPanel.removeEventListener('focusin', handleFocus);
    };
  }, [currentStep, selectedType]);

  const selectedNode =
    selectedNodeType === 'trigger'
      ? trigger
      : actions.find((a) => a.id === selectedNodeId);

  // Initialize form state from existing node
  useEffect(() => {
    if (selectedNode) {
      setSelectedType(selectedNode.type);
      // Extract formatter type and transform type from config for transform actions
      if (selectedNode.type === 'transform') {
        const config = selectedNode.config as Record<string, unknown>;
        setFormatterType((config.type as string) || '');
        setTransformType((config.operation as string) || '');
      }
      // Extract database type from config for database actions
      if (selectedNode.type === 'database') {
        const config = selectedNode.config as Record<string, unknown>;
        setDatabaseType((config.databaseType as string) || '');
      }
      // Extract inbound email from config for email triggers
      if (selectedNode.type === 'email') {
        const config = selectedNode.config as Record<string, unknown>;
        setInboundEmail((config.inboundEmail as string) || '');
      }
      // Extract trigger ID from existing trigger for webhook triggers
      // For webhook triggers, the trigger ID is stored in the trigger object itself (not in config)
      if (selectedNode.type === 'webhook' && selectedNodeType === 'trigger') {
        // If trigger already exists (has an ID), use it; otherwise we'll generate on continue
        // The trigger ID is stored in the trigger.id field
        if (selectedNode.id) {
          setWebhookTriggerId(selectedNode.id);
        }
      }
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
      setFormatterType('');
      setTransformType('');
      setDatabaseType('');
      setInboundEmail('');
      setWebhookTriggerId('');
      setCurrentStep('setup');
    }
  }, [selectedNode]);

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    // Reset formatter state when changing action type
    if (type !== 'transform') {
      setFormatterType('');
      setTransformType('');
    }
    // Reset database state when changing action type
    if (type !== 'database') {
      setDatabaseType('');
    }
    // Reset email state when changing trigger type
    if (type !== 'email') {
      setInboundEmail('');
    }
    // Reset webhook state when changing trigger type
    if (type !== 'webhook') {
      setWebhookTriggerId('');
    }
  };

  const handleSetupContinue = async () => {
    // For transform actions, we need formatter type and transform type before continuing
    if (selectedType === 'transform') {
      if (formatterType && transformType) {
        setCurrentStep('configure');
      }
    } else if (selectedType === 'database') {
      // For database actions, we need database type before continuing
      if (databaseType) {
        setCurrentStep('configure');
      }
    } else if (selectedType === 'email' && selectedNodeType === 'trigger') {
      // For email triggers, generate unique email before continuing
      if (!inboundEmail || isGeneratingEmail) {
        setIsGeneratingEmail(true);
        try {
          const token = await getToken();
          const email = await generateUniqueEmail(token);
          setInboundEmail(email);
          setCurrentStep('configure');
        } catch (error) {
          console.error('Error generating email:', error);
          toast.error('Failed to generate email address. Please try again.');
        } finally {
          setIsGeneratingEmail(false);
        }
      } else {
        setCurrentStep('configure');
      }
    } else if (selectedType === 'webhook' && selectedNodeType === 'trigger') {
      // For webhook triggers, generate UUID before continuing
      if (!webhookTriggerId) {
        // Generate UUID once - it will remain stable
        const triggerId = crypto.randomUUID();
        setWebhookTriggerId(triggerId);
      }
      setCurrentStep('configure');
    } else {
      setCurrentStep('configure');
    }
  };

  const handleConfigureSave = (config: Record<string, unknown>) => {
    if (!selectedNodeId || !selectedNodeType) return;

    try {
      const finalConfig = {
        ...config,
      };

      if (selectedNodeType === 'trigger') {
        // For webhook triggers, store the trigger ID in the trigger object
        // The trigger ID will be used when publishing the workflow
        const triggerId =
          selectedType === 'webhook' && webhookTriggerId
            ? webhookTriggerId
            : trigger?.id || `trigger-${Date.now()}`;

        setTrigger({
          id: triggerId,
          type: selectedType,
          config: finalConfig,
        });
        toast.success('Trigger configuration saved successfully');
      } else if (selectedNodeType === 'action') {
        updateAction(selectedNodeId, {
          type: selectedType,
          config: finalConfig,
        });
        toast.success('Action configuration saved successfully');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to save configuration';
      toast.error(errorMessage);
    }

    // Don't close panel - let user see the saved state
    // User can close manually if needed
  };

  const getTypeDisplayName = (type: string, nodeType: 'trigger' | 'action'): string => {
    const typeMap: Record<string, string> = {
      cron: 'Cron',
      email: 'Email',
      webhook: 'Webhook',
      http: 'HTTP',
      database: 'Database',
      telegram: 'Telegram',
      transform: 'Transform',
    };
    
    const displayName = typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
    const suffix = nodeType === 'trigger' ? 'Trigger' : 'Action';
    return `${displayName} ${suffix}`;
  };

  const getNodeTitle = () => {
    if (!selectedNodeType || !selectedType) return 'Configuration';
    
    let stepNumber: number;
    
    if (selectedNodeType === 'trigger') {
      stepNumber = 1;
    } else {
      // For actions, find the action in the actions array and get its order
      const action = actions.find((a) => a.id === selectedNodeId);
      stepNumber = action ? action.order + 2 : 2;
    }
    
    const displayName = getTypeDisplayName(selectedType, selectedNodeType);
    return `${stepNumber}. ${displayName}`;
  };

  // Check if configure step is completed (has saved config)
  const isConfigureCompleted = () => {
    if (!selectedNode) return false;
    // For cron triggers, check if cronExpression exists
    if (selectedNode.type === 'cron') {
      return !!selectedNode.config.cronExpression;
    }
    // For email triggers, check if inboundEmail exists
    if (selectedNode.type === 'email' && selectedNodeType === 'trigger') {
      return !!selectedNode.config.inboundEmail;
    }
    // For webhook triggers, check if trigger has an ID (webhook triggers don't need config)
    if (selectedNode.type === 'webhook' && selectedNodeType === 'trigger') {
      // Webhook triggers are complete if they have been configured (trigger ID exists)
      // The trigger ID is stored in the trigger object itself, not in config
      return !!trigger?.id || !!selectedNode.id;
    }
    // For email actions, check if all required fields exist
    if (selectedNode.type === 'email' && selectedNodeType === 'action') {
      return (
        !!selectedNode.config.to &&
        !!selectedNode.config.subject &&
        !!selectedNode.config.body
      );
    }
    // For HTTP actions, check if URL exists (required field)
    if (selectedNode.type === 'http') {
      return !!selectedNode.config.url;
    }
    // For transform actions, check if type and operation exist
    if (selectedNode.type === 'transform') {
      const config = selectedNode.config as Record<string, unknown>;
      return !!config.type && !!config.operation;
    }
    // For database actions, check if databaseType, connection, table, and operation exist
    if (selectedNode.type === 'database') {
      const config = selectedNode.config as Record<string, unknown>;
      return (
        !!config.databaseType &&
        !!config.connection &&
        !!config.table &&
        !!config.operation
      );
    }
    // For Telegram actions, check if botToken, chatId, and message exist
    if (selectedNode.type === 'telegram') {
      return (
        !!selectedNode.config.botToken &&
        !!selectedNode.config.chatId &&
        !!selectedNode.config.message
      );
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

  const currentStepOrder = selectedNode && selectedNodeType === 'action' 
    ? actions.find((a) => a.id === selectedNodeId)?.order ?? null
    : null;

  return (
    <>
      <div 
        ref={configPanelRef}
        className="fixed right-0 top-20 bottom-20 right-5 w-120 border border-gray-200 bg-white shadow-xl"
        data-config-panel
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900">
                {getNodeTitle()}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (!isAvailableDataPanelOpen && configPanelRef.current) {
                    // Calculate position relative to StepConfigPanel
                    const rect = configPanelRef.current.getBoundingClientRect();
                    setAvailableDataPanelPosition({
                      x: rect.left + 80,
                      y: rect.top + 65,
                    });
                  }
                  setIsAvailableDataPanelOpen(!isAvailableDataPanelOpen);
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
                aria-label="Toggle Available Data Panel"
                title="Available Data"
              >
                <Database className="h-4 w-4" />
                <span>Available Data</span>
              </button>
              <button
                onClick={closeConfigPanel}
                className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close panel"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

        {/* Step Navigation */}
        <StepNavigation steps={steps} onStepClick={handleStepClick} />

        {/* Step Content */}
        <div className="flex-1 flex-col overflow-hidden">
          {currentStep === 'setup' && (
            <div className="flex flex-1 flex-col h-full">
              <SetupStep
                nodeType={selectedNodeType}
                selectedType={selectedType}
                onTypeChange={handleTypeChange}
                onContinue={handleSetupContinue}
                hideContinueButton={
                  selectedType === 'transform' ||
                  selectedType === 'database' ||
                  (selectedType === 'email' && selectedNodeType === 'trigger') ||
                  (selectedType === 'webhook' && selectedNodeType === 'trigger')
                }
              />
              {selectedType === 'transform' && (
                <FormatterSetupStep
                  formatterType={formatterType}
                  transformType={transformType}
                  onFormatterTypeChange={setFormatterType}
                  onTransformTypeChange={setTransformType}
                  onContinue={handleSetupContinue}
                />
              )}
              {selectedType === 'database' && (
                <DatabaseSetupStep
                  databaseType={databaseType}
                  onDatabaseTypeChange={setDatabaseType}
                  onContinue={handleSetupContinue}
                />
              )}
              {selectedType === 'email' &&
                selectedNodeType === 'trigger' &&
                (isGeneratingEmail ? (
                  <div className="border-t border-gray-200 p-6">
                    <p className="text-sm text-gray-600">
                      Generating unique email address...
                    </p>
                  </div>
                ) : (
                  <div className="border-t border-gray-200 p-6">
                    <button
                      type="button"
                      onClick={handleSetupContinue}
                      disabled={!selectedType || isGeneratingEmail}
                      className="w-full rounded-md px-4 py-2 text-sm font-medium text-white transition-colors bg-neutral-600 hover:bg-neutral-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      Continue
                    </button>
                  </div>
                ))}
              {selectedType === 'webhook' && selectedNodeType === 'trigger' && (
                <div className="border-t border-gray-200 p-6">
                  <button
                    type="button"
                    onClick={handleSetupContinue}
                    disabled={!selectedType}
                    className="w-full rounded-md px-4 py-2 text-sm font-medium text-white transition-colors bg-neutral-600 hover:bg-neutral-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Continue
                  </button>
                </div>
              )}
            </div>
          )}

          {currentStep === 'configure' && selectedType === 'transform' && (
            <FormatterConfigureStep
              formatterType={formatterType as 'date' | 'number' | 'text'}
              transformType={transformType}
              initialValues={
                selectedNode?.type === 'transform'
                  ? (selectedNode.config as Record<string, unknown>)
                  : undefined
              }
              onSave={handleConfigureSave}
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

          {currentStep === 'configure' &&
            selectedType === 'email' &&
            selectedNodeType === 'trigger' && (
              <EmailTriggerConfigureStep
                inboundEmail={inboundEmail}
                onSave={handleConfigureSave}
              />
            )}

          {currentStep === 'configure' &&
            selectedType === 'webhook' &&
            selectedNodeType === 'trigger' && (
              <WebhookTriggerConfigureStep
                webhookUrl={
                  webhookTriggerId
                    ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/webhooks/${webhookTriggerId}`
                    : ''
                }
                onSave={handleConfigureSave}
              />
            )}

          {currentStep === 'configure' &&
            selectedType === 'email' &&
            selectedNodeType === 'action' && (
              <EmailConfigureStep
                initialValues={
                  selectedNode?.type === 'email'
                    ? (selectedNode.config as Partial<{
                        to: string;
                        subject: string;
                        body: string;
                      }>)
                    : undefined
                }
                onSave={handleConfigureSave}
              />
            )}

          {currentStep === 'configure' && selectedType === 'http' && (
            <HttpConfigureStep
              initialValues={
                selectedNode?.type === 'http'
                  ? (selectedNode.config as Record<string, unknown>)
                  : undefined
              }
              onSave={handleConfigureSave}
            />
          )}

          {currentStep === 'configure' && selectedType === 'database' && (
            <DatabaseConfigureStep
              databaseType={databaseType as 'postgres' | 'mysql'}
              initialValues={
                selectedNode?.type === 'database'
                  ? (selectedNode.config as Record<string, unknown>)
                  : undefined
              }
              onSave={handleConfigureSave}
            />
          )}

          {currentStep === 'configure' && selectedType === 'telegram' && (
            <TelegramConfigureStep
              initialValues={
                selectedNode?.type === 'telegram'
                  ? (selectedNode.config as Partial<{
                      botToken: string;
                      chatId: string;
                      message: string;
                    }>)
                  : undefined
              }
              onSave={handleConfigureSave}
            />
          )}

          {/* Placeholder for other trigger/action types */}
          {currentStep === 'configure' &&
            selectedType !== 'cron' &&
            selectedType !== 'email' &&
            selectedType !== 'http' &&
            selectedType !== 'transform' &&
            selectedType !== 'database' &&
            selectedType !== 'telegram' && (
              <div className="flex flex-1 items-center justify-center p-6">
                <p className="text-sm text-gray-500">
                  Configuration for {selectedType} is not yet implemented.
                </p>
              </div>
            )}
        </div>
      </div>
    </div>
    
    {/* Draggable Available Data Panel */}
    <DraggableAvailableDataPanel
      trigger={trigger}
      actions={actions}
      currentStepOrder={currentStepOrder}
      onFieldClick={handleAvailableDataFieldClick}
      isOpen={isAvailableDataPanelOpen}
      onClose={() => setIsAvailableDataPanelOpen(false)}
      position={availableDataPanelPosition}
      onPositionChange={setAvailableDataPanelPosition}
    />
    </>
  );
}
