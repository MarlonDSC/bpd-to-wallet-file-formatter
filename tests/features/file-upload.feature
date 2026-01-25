Feature: File Upload and Validation
    As a user
    I want to upload CSV files with validation
    So that I can convert them to Excel format

    Background:
        Given the application is loaded
        And the user is on the converter page

    @success @smoke
    Scenario: Upload single CSV file via file picker
        Given the user has a valid CSV file
        When the user clicks the "Choose Files" button
        And the user selects a CSV file
        Then the file is added to the upload queue
        And the file name is displayed
        And the file size is displayed
        And no error messages are shown

    @success
    Scenario: Upload multiple CSV files
        Given the user has multiple valid CSV files
        When the user clicks the "Choose Files" button
        And the user selects multiple CSV files
        Then all files are added to the upload queue
        And all file names are displayed in a list
        And the file count is shown

    @success @manual
    Scenario: Upload file via drag-and-drop
        Given the user has a valid CSV file
        When the user drags the file over the drop zone
        Then the drop zone is highlighted
        And visual feedback is shown
        When the user drops the file
        Then the file is added to the upload queue
        And the file name is displayed

    @success
    Scenario: Remove file from upload queue
        Given the user has uploaded a file
        And the file is displayed in the upload queue
        When the user clicks the "Remove" button next to the file
        Then the file is removed from the upload queue
        And the file list is updated

    @failure @validation
    Scenario: Upload non-CSV file
        Given the user has a non-CSV file
        When the user attempts to upload the file
        Then an error message about invalid file type is displayed
        And the file is not added to the upload queue
        And the error message is highlighted

    @failure @validation
    Scenario: Upload file exceeding size limit
        Given the user has a CSV file larger than 10MB
        When the user attempts to upload the file
        Then an error message about file size limit is displayed
        And the file is not added to the upload queue
        And the error message is highlighted

    @failure @validation @manual
    Scenario: Drag non-CSV file
        Given the user has a non-CSV file
        When the user drags the file over the drop zone
        Then the drop zone shows an error state
        And an error message is displayed
        When the user drops the file
        Then the file is not added to the upload queue
