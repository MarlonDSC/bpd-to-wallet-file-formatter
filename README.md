# BPD to Wallet File Formatter

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=CodeFlow-Dynamics_bpd-to-wallet-file-formatter&metric=alert_status&token=66001666be4548f75c677236426593a24a93c6c0)](https://sonarcloud.io/summary/new_code?id=CodeFlow-Dynamics_bpd-to-wallet-file-formatter)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=CodeFlow-Dynamics_bpd-to-wallet-file-formatter&metric=coverage&token=66001666be4548f75c677236426593a24a93c6c0)](https://sonarcloud.io/summary/new_code?id=CodeFlow-Dynamics_bpd-to-wallet-file-formatter)

A React application to convert BPD CSV files to wallet format, built with Domain-Driven Design (DDD) and Behavior-Driven Development (BDD) principles.

## Features

- 📁 Upload and validate BPD CSV files
- 🔄 Transform data to wallet format
- 📊 Preview and validate transactions
- 💾 Export to Excel format
- ✨ Modern, responsive UI
- 🧪 Comprehensive test coverage
- 🔍 Static code analysis with SonarCloud

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

## CI/CD

This project uses GitHub Actions for continuous integration and deployment:

- **CI Workflow**: Runs on every push and pull request
  - Code linting
  - Type checking
  - Unit and integration tests
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
