/**
 * FileUpload - Component for file upload with drag-and-drop support
 */

import { useRef, useEffect, useMemo } from 'react';
import { useFileUpload } from '../hooks/useFileUpload';
import { useCsvParser } from '../hooks/useCsvParser';
import { useTransactionTransformer } from '../hooks/useTransactionTransformer';
import { CsvParsingStatus } from './CsvParsingStatus';
import { TransformationStatus } from './TransformationStatus';
import { DataPreview } from './DataPreview';
import { ExcelExportButton } from './ExcelExportButton';
import { ExcelMapper } from '../../../application/excel/mappers/ExcelMapper';
import styles from '../styles/FileUpload.module.css';

export function FileUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    files,
    fileCount,
    hasErrors,
    errors,
    isDragging,
    handleFileSelect,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    removeFile,
    clearErrors,
  } = useFileUpload();

  const { isParsing, error: csvError, warningCount, results, parseFiles } =
    useCsvParser();

  const {
    isTransforming,
    error: transformError,
    transactions,
    errors: transformErrors,
    skippedCount,
    transformResults,
  } = useTransactionTransformer();

  // Automatically trigger transformation when parsing completes successfully
  useEffect(() => {
    if (results && results.length > 0 && !isParsing && !csvError) {
      transformResults(results);
    }
  }, [results, isParsing, csvError, transformResults]);

  const handleChooseFilesClick = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const getConvertButtonText = (): string => {
    if (isParsing) return 'Parsing…';
    if (isTransforming) return 'Transforming…';
    return 'Convert';
  };

  // Prepare preview data when transactions are available
  const previewData = useMemo(() => {
    if (transactions.length === 0) {
      return null;
    }

    try {
      const workbook = ExcelMapper.toDomain(transactions);
      return ExcelMapper.toViewModel(workbook);
    } catch {
      return null;
    }
  }, [transactions]);

  return (
    <div className={styles.fileUploadContainer}>
      <h2 className={styles.title}>Upload BPD CSV Files</h2>
      
      {/* Drop Zone */}
      <button
        type="button"
        className={`${styles.dropZone} ${isDragging ? styles.dragging : ''} ${hasErrors ? styles.error : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        aria-label="File drop zone"
        onClick={handleChooseFilesClick}
      >
        <div className={styles.dropZoneContent}>
          <svg
            className={styles.uploadIcon}
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p className={styles.dropZoneText}>
            {isDragging
              ? 'Drop files here'
              : 'Drag and drop CSV files here, or click to browse'}
          </p>
          <p className={styles.dropZoneHint}>
            Maximum file size: 10MB per file
          </p>
        </div>
      </button>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        multiple
        onChange={handleFileSelect}
        className={styles.hiddenInput}
        aria-label="Choose CSV files"
      />

      {/* Choose Files Button */}
      <button
        type="button"
        onClick={handleChooseFilesClick}
        className={styles.chooseFilesButton}
        aria-label="Choose files to upload"
      >
        Choose Files
      </button>

      {/* Error Messages */}
      {hasErrors && (
        <div className={styles.errorContainer} role="alert">
          <button
            type="button"
            onClick={clearErrors}
            className={styles.clearErrorsButton}
            aria-label="Clear error messages"
          >
            ×
          </button>
          <ul className={styles.errorList}>
            {errors.map((error) => (
              <li key={`${error.name}:${error.message}`} className={styles.errorItem}>
                {error.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* File List */}
      {fileCount > 0 && (
        <div className={styles.fileListContainer}>
          <h3 className={styles.fileListTitle}>
            Uploaded Files ({fileCount})
          </h3>
          <ul className={styles.fileList}>
            {files.map((file) => (
              <li key={file.id} className={styles.fileItem}>
                <div className={styles.fileInfo}>
                  <span className={styles.fileName} title={file.name}>
                    {file.name}
                  </span>
                  <span className={styles.fileSize}>
                    {formatFileSize(file.size)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(file.id)}
                  className={styles.removeButton}
                  aria-label={`Remove ${file.name}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className={styles.convertButton}
            onClick={() => parseFiles(files)}
            disabled={isParsing || isTransforming || hasErrors || fileCount === 0}
            aria-label="Convert and parse CSV files"
          >
            {getConvertButtonText()}
          </button>

          <CsvParsingStatus
            isParsing={isParsing}
            error={csvError}
            warningCount={warningCount}
            results={results}
          />

          {results && results.length > 0 && (
            <TransformationStatus
              isTransforming={isTransforming}
              error={transformError}
              transactions={transactions}
              errors={transformErrors}
              skippedCount={skippedCount}
            />
          )}

          {/* Data Preview and Excel Export */}
          {!isTransforming &&
            !transformError &&
            transactions.length > 0 &&
            previewData && (
              <>
                <DataPreview
                  headers={previewData.headers}
                  rows={previewData.rows}
                />
                <ExcelExportButton
                  transactions={transactions}
                  disabled={isParsing || isTransforming}
                />
              </>
            )}
        </div>
      )}
    </div>
  );
}
