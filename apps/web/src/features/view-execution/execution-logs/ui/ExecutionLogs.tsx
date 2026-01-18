'use client';

import { CheckCircle2, XCircle, PauseCircle, Clock, PlayCircle, Info } from 'lucide-react';
import type { ExecutionLogResponse } from '@aflow/web/shared/types/workflows';
import { cn } from '@aflow/web/shared/lib';

interface ExecutionLogsProps {
  logs: ExecutionLogResponse[];
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
      return <Info className="h-4 w-4 text-gray-400" />;
  }
}

function getEventColor(eventType: string) {
  switch (eventType) {
    case 'completed':
      return 'border-green-200 bg-green-50';
    case 'failed':
      return 'border-red-200 bg-red-50';
    case 'paused':
      return 'border-yellow-200 bg-yellow-50';
    case 'retried':
      return 'border-blue-200 bg-blue-50';
    case 'started':
      return 'border-blue-200 bg-blue-50';
    default:
      return 'border-gray-200 bg-gray-50';
  }
}

export function ExecutionLogs({ logs }: ExecutionLogsProps) {
  if (logs.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <p className="text-sm text-gray-500">No logs available</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Execution Logs</h3>
      <div className="space-y-2">
        {logs.map((log) => (
          <div
            key={log.id}
            className={cn(
              'flex items-start gap-3 rounded-md border p-3',
              getEventColor(log.eventType),
            )}
          >
            <div className="mt-0.5">
              {getEventIcon(log.eventType)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  Step {log.stepOrder + 1}
                </span>
                <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700 capitalize">
                  {log.eventType}
                </span>
                <span className="ml-auto text-xs text-gray-500 font-mono">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
              {log.metadata && Object.keys(log.metadata).length > 0 && (
                <div className="mt-2 rounded-md bg-white/60 p-2">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
