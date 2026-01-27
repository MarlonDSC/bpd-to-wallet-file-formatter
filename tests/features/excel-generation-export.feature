Feature: Excel Generation and Export
    As a user
    I want to generate and download Excel files from converted data
    So that I can import them into my wallet/accounting software

    Background:
        Given the application is loaded
        And the user is on the converter page
        And a valid BPD CSV file with transaction data has been uploaded
        And the user clicks "Convert" button
        And parsing completes successfully
        And transaction data has been transformed successfully

    @success @smoke
    Scenario: Generate and download Excel file
        Given transformed transaction data is available
        When the data preview is displayed
        And the user clicks "Download Excel" button
        Then an Excel file is generated
        And the file is in .xlsx format
        And the worksheet contains headers: Date, Date (Import), Note, Currency, Amount
        And headers are bold and formatted
        And all transaction rows are included
        And the file is automatically downloaded
        And the file name includes a timestamp

    @success
    Scenario: Preview data before download
        Given transformed transaction data is available
        When the data preview is displayed
        Then a table is shown with columns: Date, Date (Import), Note, Currency, Amount
        And all transactions are displayed in the table
        And the table is scrollable for large datasets
        And the user can review the data before downloading

    @success
    Scenario: Format date columns correctly
        Given transformed transaction data with dates
        When the user clicks "Download Excel" button
        And the Excel file is downloaded
        Then Date column is formatted as DD/MM/YYYY
        And Date (Import) column is formatted as DD/MM/YYYY
        And dates are stored as date values (not text)

    @success
    Scenario: Format amount column correctly
        Given transformed transaction data with amounts
        When the user clicks "Download Excel" button
        And the Excel file is downloaded
        Then Amount column is formatted as number with 2 decimal places
        And negative amounts are displayed with minus sign
        And positive amounts are displayed without plus sign

    @success
    Scenario: Format currency column correctly
        Given transformed transaction data
        When the user clicks "Download Excel" button
        And the Excel file is downloaded
        Then Currency column contains "DOP" text for all rows
        And currency is formatted as text

    @success
    Scenario: Generate Excel from multiple CSV files
        Given transaction data from multiple CSV files
        When the user clicks "Download Excel" button
        And the Excel file is downloaded
        Then all transactions from all files are included
        And transactions are in a single worksheet
        And the file name indicates it contains multiple files

    @success
    Scenario: Generate file name with date range
        Given transaction data with date range from "01/01/2010" to "31/01/2010"
        When the user clicks "Download Excel" button
        And the Excel file is downloaded
        Then the file name includes the date range
        And the file name is descriptive and unique

    @failure @error-handling @manual
    Scenario: Handle Excel generation error
        Given transformed transaction data is available
        And an error occurs during Excel generation
        When the user clicks "Download Excel" button
        Then an error message is displayed
        And the download does not proceed
        And the user is informed of the error
