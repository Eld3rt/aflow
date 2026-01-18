import { useCallback } from 'react';

/**
 * Hook for inserting template placeholders into input/textarea elements.
 * Handles cursor position and text insertion at the correct location.
 */
export function useTemplateInsertion() {
  const insertTemplate = useCallback(
    (inputElement: HTMLInputElement | HTMLTextAreaElement, path: string) => {
      const placeholder = `{{${path}}}`;
      const start = inputElement.selectionStart || 0;
      const end = inputElement.selectionEnd || 0;
      const currentValue = inputElement.value;

      // Insert placeholder at cursor position
      const newValue =
        currentValue.slice(0, start) + placeholder + currentValue.slice(end);

      // Use React's native value setter to properly trigger onChange handlers
      // This ensures React Hook Form detects the change
      // Works for both input and textarea elements
      const elementPrototype =
        inputElement instanceof HTMLInputElement
          ? HTMLInputElement.prototype
          : HTMLTextAreaElement.prototype;

      const nativeValueSetter = Object.getOwnPropertyDescriptor(
        elementPrototype,
        'value',
      )?.set;

      if (nativeValueSetter) {
        nativeValueSetter.call(inputElement, newValue);
      } else {
        inputElement.value = newValue;
      }

      // Set cursor position after inserted placeholder
      const newCursorPos = start + placeholder.length;
      inputElement.setSelectionRange(newCursorPos, newCursorPos);

      // Trigger both input and change events to ensure React Hook Form detects the change
      // React Hook Form listens to native events and React's synthetic events
      const inputEvent = new Event('input', { bubbles: true });
      const changeEvent = new Event('change', { bubbles: true });
      inputElement.dispatchEvent(inputEvent);
      inputElement.dispatchEvent(changeEvent);

      // Focus the input to ensure it remains focused
      inputElement.focus();
    },
    [],
  );

  return { insertTemplate };
}
