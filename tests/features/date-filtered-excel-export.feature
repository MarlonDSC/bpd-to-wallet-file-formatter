Feature: Date-Filtered Excel Export
    As a user
    I want to download Excel files filtered by different date ranges
    So that I can export transaction data for specific time periods

    Background:
        Given the application is loaded
        And the user is on the converter page
        And a valid BPD CSV file with transaction data has been uploaded
        And the user clicks the "Convert" button
        And parsing completes successfully
        And transaction data has been transformed successfully

    @success @smoke
    Scenario: Download all transactions with date range filename
        Given the user is viewing the Excel export section
        When the user selects "All" from the date filter dropdown
        And the user clicks the "Download Excel" button
        Then an Excel file is generated
        And the filename matches pattern "YYYY-MM-DD_YYYY-MM-DD.xlsx"
        And the file contains all transactions

    @success
    Scenario: Download last month's transactions
        Given transaction data contains transactions from the previous month
        When the user selects "Last month" from the date filter dropdown
        And the user clicks the "Download Excel" button
        Then an Excel file is generated
        And the filename matches pattern "[Month] YYYY.xlsx"
        And the file contains only transactions from the previous month

    @success
    Scenario: Download transactions by specific month using popup
        Given transaction data spans multiple months
        When the user selects "By month" from the date filter dropdown
        Then a popup appears with "All" radio button and "Select" checklist
        When the user selects "November 2025" from the month checklist
        And the user clicks "Apply" in the popup
        And the user clicks the "Download Excel" button
        Then an Excel file is generated
        And the filename is "November 2025.xlsx"
        And the file contains only transactions from November 2025

    @success
    Scenario: Download multiple months using popup
        Given transaction data spans multiple months
        When the user selects "By month" from the date filter dropdown
        Then a popup appears with "All" radio button and "Select" checklist
        When the user selects multiple months from the checklist
        And the user clicks "Apply" in the popup
        And the user clicks the "Download Excel" button
        Then multiple Excel files are generated
        And each file contains transactions from the corresponding month
        And each filename matches pattern "[Month] YYYY.xlsx"

    @success
    Scenario: Download transactions by fortnightly pay period using popup
        Given transaction data contains transactions from multiple pay periods
        When the user selects "By fortnightly pay" from the date filter dropdown
        Then a popup appears with "All" radio button and "Select" checklist
        When the user selects "2024_Jan_15" from the pay period checklist
        And the user clicks "Apply" in the popup
        And the user clicks the "Download Excel" button
        Then an Excel file is generated
        And the filename is "2024_Jan_15.xlsx"
        And the file contains only transactions from that pay period

    @success
    Scenario: Download multiple pay periods using popup
        Given transaction data contains transactions from multiple pay periods
        When the user selects "By fortnightly pay" from the date filter dropdown
        Then a popup appears with "All" radio button and "Select" checklist
        When the user selects multiple pay periods from the checklist
        And the user clicks "Apply" in the popup
        And the user clicks the "Download Excel" button
        Then multiple Excel files are generated
        And each file contains transactions from the corresponding pay period
        And each filename matches pattern "YYYY_Mmm_DD.xlsx"

    @success
    Scenario: Download transactions by week using popup
        Given transaction data contains transactions from multiple weeks
        When the user selects "By week" from the date filter dropdown
        Then a popup appears with "All" radio button and "Select" checklist
        When the user selects "2025_W2" from the week checklist
        And the user clicks "Apply" in the popup
        And the user clicks the "Download Excel" button
        Then an Excel file is generated
        And the filename is "2025_W2.xlsx"
        And the file contains only transactions from week 2 of 2025

    @success
    Scenario: Download multiple weeks using popup
        Given transaction data contains transactions from multiple weeks
        When the user selects "By week" from the date filter dropdown
        Then a popup appears with "All" radio button and "Select" checklist
        When the user selects multiple weeks from the checklist
        And the user clicks "Apply" in the popup
        And the user clicks the "Download Excel" button
        Then multiple Excel files are generated
        And each file contains transactions from the corresponding week
        And each filename matches pattern "YYYY_W[week-number].xlsx"

    @success
    Scenario: Download all items using "All" option in popup
        Given transaction data spans multiple months
        When the user selects "By month" from the date filter dropdown
        Then a popup appears with "All" radio button and "Select" checklist
        When the user selects "All" radio button
        And the user clicks "Apply" in the popup
        And the user clicks the "Download Excel" button
        Then multiple Excel files are generated
        And each file contains transactions from one month
        And all available months are included

    @success
    Scenario: Download last week's transactions
        Given transaction data contains transactions from the previous week
        When the user selects "Last week" from the date filter dropdown
        And the user clicks the "Download Excel" button
        Then an Excel file is generated
        And the filename matches pattern "YYYY_W[week-number].xlsx"
        And the file contains only transactions from the previous week

    @failure @validation
    Scenario: Disabled filter option shows info tooltip
        Given transaction data only contains transactions up to week 45
        And the current week is week 50
        When the user views the date filter dropdown
        Then "Last week" option is disabled
        And an info icon is displayed next to "Last week"
        When the user hovers over the info icon
        Then a tooltip appears below the icon explaining why the option is unavailable
        And the tooltip message is fully visible

    @failure @validation
    Scenario: Disabled "Last month" option shows info tooltip
        Given transaction data does not contain any transactions for the previous month
        When the user views the date filter dropdown
        Then "Last month" option is disabled
        And an info icon is displayed next to "Last month"
        When the user hovers over the info icon
        Then a tooltip appears below the icon explaining why the option is unavailable
        And the tooltip message is fully visible

    @edge-case
    Scenario: Single month data shows disabled "By month" option
        Given transaction data contains transactions from only one month
        When the user views the date filter dropdown
        Then "By month" option is disabled
        And an info icon explains "Only one month of data available"

    @edge-case
    Scenario: No transactions available
        Given no transaction data is available
        When the user views the date filter dropdown
        Then all filter options except "All" are disabled
        And info icons explain that no data is available for filtering

    @edge-case
    Scenario: Cancel popup without applying selection
        Given transaction data spans multiple months
        When the user selects "By month" from the date filter dropdown 
        Then a popup appears with "All" radio button and "Select" checklist
        When the user selects some months from the checklist
        And the user clicks "Cancel" in the popup
        Then the popup closes
        And no filter is applied
        And the dropdown shows the previous selection or default

    @edge-case
    Scenario: Apply popup with no selection
        Given transaction data spans multiple months
        When the user selects "By month" from the date filter dropdown
        Then a popup appears with "All" radio button and "Select" checklist
        When the user selects "Select" radio button
        And no items are checked in the checklist
        Then the "Apply" button is disabled
