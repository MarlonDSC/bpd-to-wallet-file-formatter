/**
 * FileUpload - Component for file upload with drag-and-drop support
 */

import { useRef, useEffect, useMemo } from 'react';
import { useFileUpload } from '../hooks/useFileUpload';
import { useCsvParser } from '../hooks/useCsvParser';
import { usePdfParser } from '../hooks/usePdfParser';
import { useTransactionTransformer } from '../hooks/useTransactionTransformer';
import type { BpdUploadMode } from '../../../domain/files/value-objects/BpdUploadMode';
import { Stepper } from './Stepper';
import { ConversionStatus } from './ConversionStatus';
import { DataPreview, type DataPreviewHandle } from './DataPreview';
import { ExcelExportSplitButton } from './ExcelExportSplitButton';
import { ExcelMapper } from '../../../application/excel/mappers/ExcelMapper';
import styles from '../styles/FileUpload.module.css';

export function FileUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dataPreviewRef = useRef<DataPreviewHandle>(null);
  const {
    files,
    fileCount,
    hasErrors,
    errors,
    isDragging,
    uploadMode,
    setUploadMode,
    handleFileSelect,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    removeFile,
    clearErrors,
    clearAll,
  } = useFileUpload();

  const {
    isParsing: isParsingCsv,
    error: csvError,
    warningCount: csvWarningCount,
    results: csvResults,
    parseFiles,
    reset: resetCsvParser,
  } = useCsvParser();

  const {
    isParsing: isParsingPdf,
    error: pdfError,
    warningCount: pdfWarningCount,
    results: pdfResults,
    parsePdfFiles,
    reset: resetPdfParser,
  } = usePdfParser();

  const isPdfMode = uploadMode === 'bpd-pdf';
  const isParsing = isPdfMode ? isParsingPdf : isParsingCsv;
  const parseError = isPdfMode ? pdfError : csvError;
  const warningCount = isPdfMode ? pdfWarningCount : csvWarningCount;
  const results = isPdfMode ? pdfResults : csvResults;

  const {
    isTransforming,
    error: transformError,
    transactions,
    errors: transformErrors,
    skippedCount,
    transformResults,
    reset: resetTransformer,
  } = useTransactionTransformer();

  function changeUploadMode(mode: BpdUploadMode) {
    if (mode === uploadMode) {
      return;
    }
    resetCsvParser();
    resetPdfParser();
    resetTransformer();
    setUploadMode(mode);
  }

  // Automatically trigger transformation when parsing completes successfully
  useEffect(() => {
    if (results && results.length > 0 && !isParsing && !parseError) {
      transformResults(results);
    }
  }, [results, isParsing, parseError, transformResults]);

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

  // Determine current step for stepper
  const isConversionComplete =
    !isParsing && !isTransforming && transactions.length > 0 && !transformError;
  const currentStep = isConversionComplete ? 1 : 0;
  const completedSteps = isConversionComplete ? [0] : [];

  // Handle clear/reset
  const handleClear = () => {
    resetCsvParser();
    resetPdfParser();
    resetTransformer();
    clearAll();
  };

  // Stepper descriptions
  let uploadDescription: string;
  if (fileCount > 0) {
    const fileText = fileCount === 1 ? 'file' : 'files';
    uploadDescription = `${fileCount} ${fileText} uploaded`;
  } else {
    uploadDescription = isPdfMode
      ? 'Select BPD statement PDF files to convert'
      : 'Select BPD CSV files to convert';
  }
  
  let convertDescription: string;
  if (isConversionComplete) {
    const transactionText = transactions.length === 1 ? 'transaction' : 'transactions';
    convertDescription = `${transactions.length} ${transactionText} ready`;
  } else {
    convertDescription = 'Convert and preview your data';
  }

  return (
    <div className={styles.fileUploadContainer}>
      <h2 className={styles.title}>Upload BPD files</h2>

      <div className={styles.modeToggle} role="group" aria-label="Statement format">
        <button
          type="button"
          className={`${styles.modeButton} ${!isPdfMode ? styles.modeButtonActive : ''}`}
          onClick={() => changeUploadMode('bpd-csv')}
          aria-pressed={!isPdfMode}
        >
          CSV statement
        </button>
        <button
          type="button"
          className={`${styles.modeButton} ${isPdfMode ? styles.modeButtonActive : ''}`}
          onClick={() => changeUploadMode('bpd-pdf')}
          aria-pressed={isPdfMode}
        >
          PDF statement
        </button>
      </div>

      {/* Stepper */}
      <Stepper
        steps={[
          {
            id: 'upload',
            label: 'Upload Files',
            description: uploadDescription,
          },
          {
            id: 'convert',
            label: 'View & Download',
            description: convertDescription,
          },
        ]}
        currentStep={currentStep}
        completedSteps={completedSteps}
      />
      
      {/* Step 1: Upload & Convert */}
      {currentStep === 0 && (
        <>
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
                  : isPdfMode
                    ? 'Drag and drop PDF files here, or click to browse'
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
            accept={isPdfMode ? '.pdf,application/pdf' : '.csv,text/csv'}
            multiple
            onChange={handleFileSelect}
            className={styles.hiddenInput}
            aria-label={isPdfMode ? 'Choose PDF files' : 'Choose CSV files'}
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
                onClick={() =>
                  isPdfMode ? parsePdfFiles(files) : parseFiles(files)
                }
                disabled={isParsing || isTransforming || hasErrors || fileCount === 0}
                aria-label={
                  isPdfMode ? 'Convert and parse PDF statements' : 'Convert and parse CSV files'
                }
              >
                {getConvertButtonText()}
              </button>

              <ConversionStatus
                isPdfSource={isPdfMode}
                isParsing={isParsing}
                parsingError={parseError}
                parsingWarningCount={warningCount}
                parsingResults={results}
                isTransforming={isTransforming}
                transformationError={transformError}
                transactions={transactions}
                transformationErrors={transformErrors}
                skippedCount={skippedCount}
              />
            </div>
          )}
        </>
      )}

      {/* Step 2: View & Download */}
      {currentStep === 1 && previewData && (
        <div className={styles.resultsSection}>
          <DataPreview
            ref={dataPreviewRef}
            headers={previewData.headers}
            rows={previewData.rows}
          />
          <ExcelExportSplitButton
            transactions={transactions}
            disabled={isParsing || isTransforming}
            onViewTable={() => {
              dataPreviewRef.current?.openSidebar();
            }}
            showViewTable={true}
          />
          <button
            type="button"
            onClick={handleClear}
            className={styles.clearButton}
            aria-label="Clear all and start over"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
