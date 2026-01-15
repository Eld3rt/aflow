'use client';

import { ArrowLeft, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';
import { useEditorStore } from '@aflow/web/shared/stores/editor-store';
import { cn } from '@aflow/web/shared/lib/cn';

interface TopNavBarProps {
  onPublish: () => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
  isPublishDisabled: boolean;
}

export function TopNavBar({
  onPublish,
  onRename,
  onDelete,
  isPublishDisabled,
}: TopNavBarProps) {
  const router = useRouter();
  const workflowName = useEditorStore(
    (state) => state.workflow?.name || 'Untitled Workflow',
  );
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newName, setNewName] = useState(workflowName);

  const handleRename = () => {
    if (newName.trim()) {
      onRename(newName.trim());
      setIsRenameDialogOpen(false);
    }
  };

  const handleDelete = () => {
    onDelete();
    setIsDeleteDialogOpen(false);
  };

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

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-2 rounded-md px-3 py-1.5 text-lg font-medium text-gray-900 hover:bg-gray-100">
              <span>{workflowName}</span>
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="min-w-[180px] rounded-md border border-gray-200 bg-white p-1 shadow-lg"
              sideOffset={5}
            >
              <DropdownMenu.Item
                className="cursor-pointer rounded-sm px-3 py-2 text-sm text-gray-700 outline-none hover:bg-gray-100"
                onSelect={() => {
                  setNewName(workflowName);
                  setIsRenameDialogOpen(true);
                }}
              >
                Rename workflow
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className="cursor-pointer rounded-sm px-3 py-2 text-sm text-red-600 outline-none hover:bg-red-50"
                onSelect={() => setIsDeleteDialogOpen(true)}
              >
                Delete workflow
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      <button
        onClick={onPublish}
        disabled={isPublishDisabled}
        className={cn(
          'rounded-md px-4 py-2 text-sm font-medium text-white transition-colors',
          isPublishDisabled
            ? 'cursor-not-allowed bg-gray-300'
            : 'bg-neutral-800 hover:bg-neutral-900',
        )}
      >
        Publish
      </button>

      {/* Rename Dialog */}
      <Dialog.Root
        open={isRenameDialogOpen}
        onOpenChange={setIsRenameDialogOpen}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-neutral-800/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-xl">
            <Dialog.Title className="mb-4 text-lg font-semibold text-gray-900">
              Rename Workflow
            </Dialog.Title>
            <div className="mb-4">
              <input
                type="text"
                value={newName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const target = e.currentTarget as unknown as {
                    value: string;
                  };
                  setNewName(target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename();
                  if (e.key === 'Escape') setIsRenameDialogOpen(false);
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:black"
                placeholder="Workflow name"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsRenameDialogOpen(false)}
                className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleRename}
                disabled={!newName.trim()}
                className="rounded-md bg-neutral-800 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-900 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                Save
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete Dialog */}
      <Dialog.Root
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-neutral-800/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-xl">
            <Dialog.Title className="mb-4 text-lg font-semibold text-gray-900">
              Delete Workflow
            </Dialog.Title>
            <p className="mb-4 text-sm text-gray-600">
              Are you sure you want to delete this workflow? This action cannot
              be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsDeleteDialogOpen(false)}
                className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
