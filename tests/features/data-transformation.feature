Feature: Data Transformation and Mapping
    As a user
    I want to transform CSV transaction data to Excel format
    So that it can be exported correctly

    Background:
        Given the application is loaded
        And the user is on the converter page
        And CSV data has been parsed successfully
        And transaction rows have been extracted

    @success @smoke
    Scenario: Transform valid transaction data
        Given a valid transaction row with date "10/01/2010", description "Payment", amount "123.45"
        When the transaction is transformed
        Then the Date is "10/01/2010"
        And the Date (Import) is "11/01/2010" (date + 1 day)
        And the Note is "Payment"
        And the Currency is "DOP"
        And the Amount is "123.45" (positive for credit)
        And transformation completes successfully

    @success
    Scenario: Calculate Date (Import) with month boundary
        Given a transaction with date "31/01/2010"
        When the transaction is transformed
        Then the Date is "31/01/2010"
        And the Date (Import) is "01/02/2010" (correctly handles month boundary)

    @success
    Scenario: Calculate Date (Import) with year boundary
        Given a transaction with date "31/12/2010"
        When the transaction is transformed
        Then the Date is "31/12/2010"
        And the Date (Import) is "01/01/2011" (correctly handles year boundary)

    @success
    Scenario: Format debit transaction (negative amount)
        Given a transaction with amount "-500.25"
        When the transaction is transformed
        Then the Amount is "-500.25" (negative for debit)
        And the transaction type is identified as debit

    @success
    Scenario: Format credit transaction (positive amount)
        Given a transaction with amount "123.45"
        When the transaction is transformed
        Then the Amount is "123.45" (positive for credit)
        And the transaction type is identified as credit

    @success
    Scenario: Preserve amount decimal precision
        Given a transaction with amount "123.456"
        When the transaction is transformed
        Then the Amount is formatted as "123.46" (rounded to 2 decimal places)

    @success
    Scenario: Handle description with special characters
        Given a transaction with description "Payment - Café & Restaurant"
        When the transaction is transformed
        Then the Note preserves special characters "Payment - Café & Restaurant"
        And special characters are handled correctly

    @failure @validation
    Scenario: Transform transaction with invalid date
        Given a transaction with invalid date "32/01/2010"
        When the transaction is transformed
        Then a transformation error message "Invalid date format in row [X]. Expected format: DD/MM/YYYY" is displayed
        And the transaction is skipped
        And a warning is shown

    @failure @validation
    Scenario: Transform transaction with invalid amount
        Given a transaction with invalid amount "abc"
        When the transaction is transformed
        Then a transformation error message "Invalid amount format in row [X]" is displayed
        And the transaction is skipped
        And a warning is shown

    @success
    Scenario: Transform multiple transactions
        Given multiple valid transaction rows
        When all transactions are transformed
        Then all transactions are processed
        And each transaction has Date, Date (Import), Note, Currency, and Amount
        And Date (Import) is Date + 1 day for each transaction
        And transformation summary is displayed
