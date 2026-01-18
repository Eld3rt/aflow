'use client';

import { CheckCircle2, XCircle, PauseCircle, Clock, PlayCircle } from 'lucide-react';
import type { ExecutionLogResponse } from '@aflow/web/shared/types/workflows';
import { cn } from '@aflow/web/shared/lib';

interface ExecutionTimelineProps {
  logs: ExecutionLogResponse[];
}

interface GroupedLog {
  stepId: string;
  stepOrder: number;
  events: ExecutionLogResponse[];
}

function getEventIcon(eventType: string) {
  switch (eventType) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-600" />;
    case 'paused':
      return <PauseCircle className="h-4 w-4 text-yellow-600" />;
    case 'retried':
      return <Clock className="h-4 w-4 text-blue-600" />;
    case 'started':
      return <PlayCircle className="h-4 w-4 text-blue-600" />;
    default:
      return <Clock className="h-4 w-4 text-gray-400" />;
  }
}

function getEventBadge(eventType: string) {
  const baseClasses = 'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium';
  
  switch (eventType) {
    case 'completed':
      return cn(baseClasses, 'bg-green-100 text-green-800');
    case 'failed':
      return cn(baseClasses, 'bg-red-100 text-red-800');
    case 'paused':
      return cn(baseClasses, 'bg-yellow-100 text-yellow-800');
    case 'retried':
      return cn(baseClasses, 'bg-blue-100 text-blue-800');
    case 'started':
      return cn(baseClasses, 'bg-blue-100 text-blue-800');
    default:
      return cn(baseClasses, 'bg-gray-100 text-gray-800');
  }
}

export function ExecutionTimeline({ logs }: ExecutionTimelineProps) {
  // Group logs by step
  const groupedByStep = logs.reduce((acc, log) => {
    const key = `${log.stepId}-${log.stepOrder}`;
    if (!acc[key]) {
      acc[key] = {
        stepId: log.stepId,
        stepOrder: log.stepOrder,
        events: [],
      };
    }
    acc[key].events.push(log);
    return acc;
  }, {} as Record<string, GroupedLog>);

  // Sort by step order
  const sortedGroups = Object.values(groupedByStep).sort(
    (a, b) => a.stepOrder - b.stepOrder,
  );

  if (sortedGroups.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <p className="text-sm text-gray-500">No execution timeline data available</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="mb-6 text-lg font-semibold text-gray-900">Execution Timeline</h3>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 h-full w-0.5 bg-gray-200" />
        
        <div className="space-y-8">
          {sortedGroups.map((group) => (
            <div key={`${group.stepId}-${group.stepOrder}`} className="relative">
              {/* Step marker */}
              <div className="absolute left-0 top-1 h-8 w-8 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center">
                <span className="text-xs font-medium text-gray-600">
                  {group.stepOrder + 1}
                </span>
              </div>

              <div className="ml-12">
                <div className="mb-2">
                  <h4 className="text-sm font-medium text-gray-900">
                    Step {group.stepOrder + 1}
                  </h4>
                  <p className="text-xs text-gray-500 font-mono">
                    {group.stepId.slice(0, 8)}...
                  </p>
                </div>

                {/* Events for this step */}
                <div className="space-y-3">
                  {group.events
                    .sort((a, b) => 
                      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                    )
                    .map((event) => (
                      <div
                        key={event.id}
                        className={cn(
                          'flex items-start gap-3 rounded-md border border-gray-100 bg-gray-50 p-3',
                          event.eventType === 'failed' && 'border-red-200 bg-red-50',
                          event.eventType === 'completed' && 'border-green-200 bg-green-50',
                        )}
                      >
                        <div className="mt-0.5">
                          {getEventIcon(event.eventType)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={getEventBadge(event.eventType)}>
                              {event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1)}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(event.timestamp).toLocaleString()}
                            </span>
                          </div>
                          {event.metadata?.error != null && (
                            <p className="mt-1 text-xs text-red-600">
                              {String(event.metadata.error)}
                            </p>
                          )}
                          {event.metadata?.retryCount != null && (
                            <p className="mt-1 text-xs text-blue-600">
                              Retry attempt: {Number(event.metadata.retryCount)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
