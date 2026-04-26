# BPD to Wallet File Formatter

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=CodeFlow-Dynamics_bpd-to-wallet-file-formatter&metric=alert_status&token=66001666be4548f75c677236426593a24a93c6c0)](https://sonarcloud.io/summary/new_code?id=CodeFlow-Dynamics_bpd-to-wallet-file-formatter)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=CodeFlow-Dynamics_bpd-to-wallet-file-formatter&metric=coverage&token=66001666be4548f75c677236426593a24a93c6c0)](https://sonarcloud.io/summary/new_code?id=CodeFlow-Dynamics_bpd-to-wallet-file-formatter)

A React application to convert BPD CSV or text-based PDF statements to wallet format, built with Domain-Driven Design (DDD) and Behavior-Driven Development (BDD) principles.

## Features

- 📁 Upload and validate BPD CSV files, or BPD statement PDFs (text-based; not scanned)
- 📄 PDF mode uses **Fecha efectiva** as the transaction date (wallet “Date” column); amounts support formats like `$464.62-` and `$51,029.76`
- 🔄 Transform data to wallet format
- 📊 Preview and validate transactions
- 💾 Export to Excel format
- ✨ Modern, responsive UI
- 🧪 Comprehensive test coverage (Unit, Integration, E2E, BDD, Visual Regression)
- 🔍 Static code analysis with SonarCloud
- 📸 Visual regression testing (Golden tests)

## PDF statement import

Use the **PDF statement** toggle on the upload screen. Parsing expects a text-based BPD statement whose table includes the headers **Fecha efectiva**, **Descripción**, and **Monto** (same logical layout as the CSV export). The app uses **Fecha efectiva** as the wallet transaction date. Scanned or image-only PDFs are not supported (no OCR). Layout quirks in some PDFs can affect how rows are detected.

## Tech Stack

- **Frontend**: React 19, TypeScript
- **Build Tool**: Vite
- **Testing**: Vitest, React Testing Library, Playwright
- **Code Quality**: ESLint, SonarCloud
- **CI/CD**: GitHub Actions

## Architecture

This project follows a layered architecture based on Domain-Driven Design (DDD):

- **Domain Layer**: Business logic and domain models
- **Application Layer**: Use cases and application orchestration
- **Infrastructure Layer**: External integrations and data access
- **Presentation Layer**: React UI components

For detailed architecture documentation, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/bpd-to-wallet-file-formatter.git
cd bpd-to-wallet-file-formatter

# Install dependencies
npm install

# Install Playwright browsers (for E2E tests)
npx playwright install
```

### Development

```bash
# Start development server
npm run dev

# Run linting
npm run lint

# Type checking
npx tsc --noEmit
```

### Testing

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run BDD tests (includes visual regression testing)
npm run test:bdd

# Update BDD visual snapshots (after intentional UI changes)
npm run test:bdd:update-snapshots

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui
```

### Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── domain/                 # Domain Layer (Business Logic)
│   ├── file-processing/
│   │   ├── entities/      # Domain entities
│   │   ├── value-objects/ # Value objects
│   │   ├── services/      # Domain services
│   │   └── repositories/  # Repository interfaces
│   └── shared/            # Shared domain concepts
│
├── application/           # Application Layer (Use Cases)
│   └── file-processing/
│       ├── use-cases/     # Application use cases
│       ├── dtos/          # Data Transfer Objects
│       └── mappers/       # Data mappers
│
├── infrastructure/        # Infrastructure Layer
│   └── file-processing/
│       ├── repositories/  # Repository implementations
│       └── adapters/      # External adapters
│
└── presentation/          # Presentation Layer (UI)
    └── file-processing/
        ├── pages/         # Page components
        ├── components/    # UI components
        └── hooks/         # Custom hooks
```

## Testing Strategy

This project uses a comprehensive testing strategy:

- **Unit Tests**: Test individual components and functions in isolation
- **Integration Tests**: Test interactions between components
- **E2E Tests**: Test complete user workflows with Playwright
- **BDD Tests**: Behavior-driven tests using Cucumber.js and Gherkin (includes visual regression testing)

### Visual Regression Testing (Golden Tests)

Visual regression testing is integrated into the BDD tests! The BDD scenarios include visual assertions that capture screenshots at key points, combining behavior and visual testing in one place.

**Running BDD Tests (with Visual Regression):**
```bash
# Run BDD tests (includes visual regression)
npm run test:bdd

# To update snapshots: delete snapshot files and re-run tests
# New baselines will be created automatically
```

Visual snapshots are automatically captured during BDD test execution and stored in `tests/features/__screenshots__/` (organized by feature/platform/browser/device). This eliminates the need for separate visual regression test files.

**Visual Coverage:**
- Initial state (empty drop zone)
- Single file uploaded state
- Multiple files uploaded state
- File list item appearance
- Error states (invalid file type, file too large)
- State after file removal

## CI/CD

This project uses GitHub Actions for continuous integration and deployment:

- **CI Workflow**: Runs on every push and pull request
  - Code linting
  - Type checking
  - Unit and integration tests
  - E2E tests
  - Visual regression tests
  - BDD tests (excluding @manual)
  - E2E tests
  - Build validation

- **SonarCloud**: Static code analysis
  - Code quality metrics
  - Security vulnerability detection
  - Code coverage tracking
  - Technical debt analysis

For detailed CI/CD setup instructions, see [docs/CI-CD-SETUP.md](./docs/CI-CD-SETUP.md).

## Documentation

- [Architecture Documentation](./ARCHITECTURE.md) - Detailed architecture with DDD/BDD patterns
- [CI/CD Setup Guide](./docs/CI-CD-SETUP.md) - Complete CI/CD setup instructions
- [CI/CD Summary](./docs/CI-CD-SUMMARY.md) - Quick reference for CI/CD
- [Feature Documentation](./docs/) - Feature-specific documentation

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests for your changes
4. Ensure all tests pass (`npm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

All pull requests must pass CI checks before merging.

## Code Quality Standards

- Minimum 80% code coverage
- All ESLint rules must pass
- No TypeScript errors
- SonarCloud quality gate must pass
- All tests must pass

## License

This project is licensed under the MIT License.

## Support

For questions or issues, please open an issue on GitHub.
