# Contributing to DB Mover

First off, thanks for taking the time to contribute! 🎉

We want to make contributing to DB Mover as easy and transparent as possible, whether it's:

-   Reporting a bug
-   Discussing the current state of the code
-   Submitting a fix
-   Proposing new features
-   Becoming a maintainer

## How to Contribute

### 1. Fork the Repository

Fork the repository to your own GitHub account and then clone it to your local device.

```bash
git clone https://github.com/YOUR_USERNAME/db-mover.git
cd db-mover
```

### 2. Install Dependencies

Install all dependencies for both the client and server.

```bash
npm run install:all
```

### 3. Create a Branch

Create a new branch for your feature or bug fix.

```bash
git checkout -b feature/amazing-feature
```

### 4. Make Your Changes

Implement your feature or bug fix. Ensure your code follows the existing style and conventions.

### 5. Test Your Changes

Run the application locally to ensure everything works as expected.

```bash
npm run dev
```

For migration work you need a real source *and* target database. `docker-compose.test.yml`
provides a pair of every supported engine, including Firebase via the official emulators:

```bash
npm run db:up      # start the databases
npm run db:seed    # load fixtures
npm run db:urls    # print connection strings
```

See [TESTING.md](TESTING.md) for what the fixtures cover, Firebase setup, and troubleshooting.

### 6. Commit and Push

Commit your changes with a descriptive commit message.

```bash
git commit -m "feat: add amazing feature"
git push origin feature/amazing-feature
```

### 7. Submit a Pull Request

Go to the original repository and submit a Pull Request (PR) from your forked repository. Provide a clear description of your changes.

## Development Workflow

-   **Frontend**: Located in `client/`. Built with React, Vite, and Tailwind CSS.
-   **Backend**: Located in `server/`. Built with Node.js and Express.

## Reporting Bugs

If you find a bug, please create a new issue on GitHub. Include as much detail as possible, such as:

-   Steps to reproduce the bug
-   Expected behavior
-   Actual behavior
-   Screenshots (if applicable)

## License

By contributing, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
