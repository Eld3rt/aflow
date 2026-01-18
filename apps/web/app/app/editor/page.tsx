import { Suspense } from 'react';
import { EditorPage } from '@aflow/web/pages/editor';

export default function Editor() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      <EditorPage />
    </Suspense>
  );
}
