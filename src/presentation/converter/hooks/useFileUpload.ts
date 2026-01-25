/**
 * useFileUpload - Custom hook for file upload functionality
 */

import { useReducer, useCallback, useRef } from 'react';
import { ValidateFileUseCase } from '../../../application/files/use-cases/ValidateFileUseCase';
import { FileMapper } from '../../../application/files/mappers/FileMapper';
import {
  initialFileUploadState,
  fileUploadReducer,
  selectors,
} from '../store/FileUploadStore';

export function useFileUpload() {
  const [state, dispatch] = useReducer(fileUploadReducer, initialFileUploadState);
  const validateFileUseCase = useRef(new ValidateFileUseCase()).current;

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      
      fileArray.forEach((file) => {
        const result = validateFileUseCase.execute(file);
        
        if (result.success) {
          const viewModel = FileMapper.toViewModelFromDto(result.data);
          dispatch({ type: 'ADD_FILE', payload: viewModel });
        } else {
          dispatch({ type: 'ADD_ERROR', payload: result.error });
        }
      });
    },
    [validateFileUseCase]
  );

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        handleFiles(files);
      }
      // Reset input to allow selecting the same file again
      event.target.value = '';
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!state.isDragging) {
      dispatch({ type: 'SET_DRAGGING', payload: true });
    }
  }, [state.isDragging]);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    // Only set dragging to false if we're leaving the drop zone
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      dispatch({ type: 'SET_DRAGGING', payload: false });
    }
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      dispatch({ type: 'SET_DRAGGING', payload: false });

      const files = event.dataTransfer.files;
      if (files && files.length > 0) {
        handleFiles(files);
      }
    },
    [handleFiles]
  );

  const removeFile = useCallback((fileId: string) => {
    dispatch({ type: 'REMOVE_FILE', payload: fileId });
  }, []);

  const clearErrors = useCallback(() => {
    dispatch({ type: 'CLEAR_ERRORS' });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  return {
    files: selectors.getFiles(state),
    fileCount: selectors.getFileCount(state),
    hasErrors: selectors.hasErrors(state),
    errors: selectors.getErrors(state),
    isDragging: selectors.isDragging(state),
    handleFileSelect,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    removeFile,
    clearErrors,
    clearAll,
  };
}
