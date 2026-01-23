# Documentation Structure

This directory contains all feature specifications and user stories for the project, organized by feature.

## Folder Structure

Each feature has its own folder following this structure:

```
docs/
  [feature-name]/
    feature-request.md          # Main feature specification (SRS)
    [child-story-1].md         # User story for sub-feature 1
    [child-story-2].md         # User story for sub-feature 2
    [child-story-n].md         # User story for sub-feature n
```

### Example Structure

```
docs/
  bpd csv file converter/
    feature-request.md
    file-upload-validation.md
    csv-parsing-extraction.md
    data-transformation-mapping.md
    excel-generation-export.md
    error-handling-feedback.md
```

## Documentation Types

### Feature Request (`feature-request.md`)

The main feature specification document that follows the Software Requirements Specification (SRS) template. This document includes:

- **Introduction**: Purpose and overview of the feature
- **Overall Feature Description**: Scope, included/excluded functionality
- **Functional Requirements**: Detailed requirements organized by category
- **Non-Functional Requirements**: Performance, security, UX requirements
- **Error Handling**: Validation errors and error scenarios
- **User Acceptance Criteria**: Gherkin-style acceptance criteria
- **Implementation Tasks**: High-level tasks organized by layer
- **Testing Checklist**: Testing requirements
- **Related Issues**: Links to child user stories

**Naming Convention**: Always named `feature-request.md` in the feature folder.

### User Stories (Child Stories)

Individual user stories that break down the feature into implementable components. Each user story follows the frontend user story template and includes:

- **Overview**: Brief description and feature area
- **Acceptance Criteria**: Specific, testable criteria
- **Technical Notes**: Component names, state management, side effects
- **Implementation Tasks**: Detailed tasks organized by architectural layer:
  - Domain Layer (Business Logic)
  - Application Layer (Use Cases)
  - Infrastructure Layer (External Concerns)
  - Presentation Layer (UI Components)
- **BDD Scenarios**: Gherkin-style behavior-driven development scenarios
- **Component Architecture**: Mermaid diagrams showing component relationships
- **Testing Checklist**: Comprehensive testing requirements
- **Definition of Done**: Completion criteria

**Naming Convention**: Descriptive kebab-case names (e.g., `file-upload-validation.md`, `csv-parsing-extraction.md`)

## Creating New Features

When creating documentation for a new feature:

1. **Create a feature folder** with a descriptive name (kebab-case)
   ```
   docs/
     my-new-feature/
   ```

2. **Create the feature request** as `feature-request.md`
   - Use the `feature_request.md` template
   - Fill in all sections comprehensively
   - Link to child stories in the "Related Issues" section

3. **Create child user stories** as separate `.md` files
   - Use the `issue_story_frontend.md` template
   - Name files descriptively (kebab-case)
   - Reference the parent feature in the "Part of feature" section

4. **Update this README** if the structure changes significantly

## File Naming Conventions

- **Feature folders**: Use kebab-case, descriptive names
  - ✅ `bpd csv file converter`
  - ✅ `user-authentication`
  - ✅ `payment-processing`
  - ❌ `Feature1` (use kebab-case)
  - ❌ `feature_request` (use descriptive name)

- **Feature request file**: Always `feature-request.md`

- **User story files**: Use kebab-case, descriptive names
  - ✅ `file-upload-validation.md`
  - ✅ `csv-parsing-extraction.md`
  - ✅ `error-handling-feedback.md`
  - ❌ `story1.md` (use descriptive name)
  - ❌ `FileUpload.md` (use kebab-case)

## Documentation Standards

### Feature Request Standards

- Must include all sections from the SRS template
- Functional requirements should be specific and testable
- Include Gherkin acceptance criteria
- Link to all child user stories
- Include implementation tasks organized by architectural layer

### User Story Standards

- Must follow the frontend user story template
- Acceptance criteria must be specific and measurable
- Implementation tasks must be organized by architectural layer (Domain, Application, Infrastructure, Presentation)
- Must include BDD scenarios in Gherkin syntax
- Must include component architecture diagrams
- Must reference the parent feature

## Current Features

### BPD CSV File Converter

**Location**: `docs/bpd csv file converter/`

A feature for converting Banco Popular Dominicano (BPD) CSV transaction files to Excel format for wallet/accounting software import.

**Child Stories**:
- `file-upload-validation.md` - File upload with drag-and-drop and validation
- `csv-parsing-extraction.md` - CSV parsing and transaction data extraction
- `data-transformation-mapping.md` - Data transformation and mapping to Excel format
- `excel-generation-export.md` - Excel file generation and export
- `error-handling-feedback.md` - Error handling and user feedback

## Best Practices

1. **Keep feature folders focused**: Each folder should represent a single, cohesive feature
2. **Break down large features**: If a feature has many sub-features, create multiple child stories
3. **Maintain consistency**: Follow the templates and naming conventions
4. **Link related documents**: Use "Related Issues" sections to link related stories
5. **Keep documentation up-to-date**: Update docs as features evolve
6. **Use clear, descriptive names**: File and folder names should clearly indicate their purpose

## Templates

The following templates are available in the root directory:

- `feature_request.md` - Template for feature request documents
- `issue_story_frontend.md` - Template for frontend user stories
- `issue_story_api.md` - Template for API user stories (if needed)

## Questions?

If you have questions about the documentation structure or need to modify it, please:
1. Review this README first
2. Check existing feature folders for examples
3. Follow the established patterns
4. Update this README if making structural changes
