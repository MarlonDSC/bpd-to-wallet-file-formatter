Feature: CSV Parsing and Data Extraction
    As a user
    I want to parse BPD CSV files and extract transaction data
    So that the data can be converted to Excel format

    Background:
        Given the application is loaded
        And the user is on the converter page

    @success @smoke
    Scenario: Parse valid BPD CSV file
        Given a valid BPD CSV file with transaction data
        When the user attempts to upload the file
        Then the file is added to the upload queue
        When the user clicks "Convert" button
        Then parsing completes successfully
        And encoding is detected automatically
        And header rows lines 1-10 are skipped
        And transaction rows are extracted
        And no errors are displayed

    @success
    Scenario: Parse CSV with UTF-8 encoding
        Given a BPD CSV file with UTF-8 encoding
        When the user attempts to upload the file
        Then the file is added to the upload queue
        When the user clicks "Convert" button
        Then parsing completes successfully
        And encoding is detected as "UTF-8"

    @success
    Scenario: Parse CSV with Windows-1252 encoding
        Given a BPD CSV file with Windows-1252 encoding
        When the user attempts to upload the file
        Then the file is added to the upload queue
        When the user clicks "Convert" button
        Then parsing completes successfully
        And encoding is detected as "Windows-1252"

    @success
    Scenario: Handle multiple header sections
        Given a BPD CSV file with multiple header sections
        When the user attempts to upload the file
        Then the file is added to the upload queue
        When the user clicks "Convert" button
        Then parsing completes successfully
        And a total of 3 transaction rows are extracted

    @success
    Scenario: Skip empty rows
        Given a BPD CSV file with empty rows between transactions
        When the user attempts to upload the file
        Then the file is added to the upload queue
        When the user clicks "Convert" button
        Then parsing completes successfully
        And a total of 2 transaction rows are extracted

    @failure @validation
    Scenario: Parse CSV with missing required columns
        Given a CSV file missing required columns
        When the user attempts to upload the file
        Then the file is added to the upload queue
        When the user clicks "Convert" button
        Then an error message "CSV file is missing required columns. Expected: Fecha Posteo, Descripción, Monto Transacción" is displayed
        And parsing stops
        And no transaction data is extracted

    @failure @validation
    Scenario: Parse invalid CSV format
        Given a malformed CSV file
        When the user attempts to upload the file
        Then the file is added to the upload queue
        When the user clicks "Convert" button
        Then an error message "Invalid CSV format. Unable to parse file." is displayed
        And parsing stops
        And no transaction data is extracted

    @failure @edge-case
    Scenario: Handle invalid rows gracefully
        Given a BPD CSV file with some invalid transaction rows
        When the user attempts to upload the file
        Then the file is added to the upload queue
        When the user clicks "Convert" button
        Then parsing completes successfully
        And a warning message is displayed showing number of skipped rows
        And a total of 2 transaction rows are extracted

 