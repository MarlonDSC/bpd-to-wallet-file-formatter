/**
 * FileUploadStore - State management for file uploads
 */

import type { FileUploadViewModel } from '../view-models/FileUploadViewModel';
import { FileError } from '../../../domain/files/errors/FileErrors';

export interface FileUploadState {
  files: FileUploadViewModel[];
  isDragging: boolean;
  errors: FileError[];
}

export type FileUploadAction =
  | { type: 'ADD_FILE'; payload: FileUploadViewModel }
  | { type: 'REMOVE_FILE'; payload: string }
  | { type: 'SET_DRAGGING'; payload: boolean }
  | { type: 'ADD_ERROR'; payload: FileError }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'CLEAR_ALL' };

export const initialFileUploadState: FileUploadState = {
  files: [],
  isDragging: false,
  errors: [],
};

export function fileUploadReducer(
  state: FileUploadState,
  action: FileUploadAction
): FileUploadState {
  switch (action.type) {
    case 'ADD_FILE':
      return {
        ...state,
        files: [...state.files, action.payload],
        errors: state.errors.filter(
          (error) => !(error instanceof FileError && error.message.includes(action.payload.name))
        ),
      };
    case 'REMOVE_FILE':
      return {
        ...state,
        files: state.files.filter((file) => file.id !== action.payload),
      };
    case 'SET_DRAGGING':
      return {
        ...state,
        isDragging: action.payload,
      };
    case 'ADD_ERROR':
      return {
        ...state,
        errors: [...state.errors, action.payload],
      };
    case 'CLEAR_ERRORS':
      return {
        ...state,
        errors: [],
      };
    case 'CLEAR_ALL':
      return initialFileUploadState;
    default:
      return state;
  }
}

// Selectors
export const selectors = {
  getFiles: (state: FileUploadState): FileUploadViewModel[] => state.files,
  getFileCount: (state: FileUploadState): number => state.files.length,
  hasErrors: (state: FileUploadState): boolean => state.errors.length > 0,
  getErrors: (state: FileUploadState): FileError[] => state.errors,
  isDragging: (state: FileUploadState): boolean => state.isDragging,
};
