'use client';

import { ArrowLeft, LayoutDashboard, Workflow } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { cn } from '@aflow/web/shared/lib';

export function DashboardNav() {
  const router = useRouter();
  const pathname = usePathname();

  const isDashboard = pathname === '/app/dashboard';
  const isWorkflowsList = pathname === '/app/workflows';

  return (
    <div className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-1">
          <Link
            href="/app/dashboard"
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isDashboard
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
          <Link
            href="/app/workflows"
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isWorkflowsList
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
            )}
          >
            <Workflow className="h-4 w-4" />
            Workflows
          </Link>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <UserButton
          appearance={{
            elements: {
              avatarBox: 'h-9 w-9',
              userButtonPopoverCard: 'rounded-lg border border-gray-200 shadow-lg',
              userButtonPopoverActions: 'p-2',
              userButtonPopoverActionButton: 'rounded-md px-3 py-2 text-sm',
            },
          }}
        />
      </div>
    </div>
  );
}
