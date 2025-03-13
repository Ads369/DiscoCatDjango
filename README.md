# DiscoCat Django Voting System

A Django-based application for creating and managing voting rooms with object ranking functionality.

## Project Overview

This application allows users to:

- Log in with a unique user ID
- View available voting rooms
- Rank items within rooms using drag-and-drop
- Add comments to their rankings
- Confirm their votes

## Development Setup

### Prerequisites

- Docker and Docker Compose
- Git
- Python 3.11+ (for local development without Docker)
- Make (optional, for convenience commands)

### Quick Start (Development)

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/discocatdjango.git
   cd discocatdjango
   ```

2. Create environment file and generate a secret key:

   ```bash
   make create-env
   ```

3. Start the development environment:

   ```bash
   make dev-up
   ```

4. Access the application at http://localhost:8000

### Local Development Without Docker

1. Set up a Python virtual environment:

   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:

   ```bash
   pip install -e ".[dev]"
   ```

3. Create a database directory:

   ```bash
   mkdir -p database
   ```

4. Run migrations:

   ```bash
   cd backend
   python manage.py migrate
   ```

5. Start the development server:
   ```bash
   python manage.py runserver
   ```

## Production Deployment

### Prerequisites

- Docker and Docker Compose
- Domain name (optional)
- SSH access to your server

### Deployment Steps

1. Clone the repository on your server:

   ```bash
   git clone https://github.com/yourusername/discocatdjango.git
   cd discocatdjango
   ```

2. Create and configure the environment file:

   ```bash
   make create-env
   ```

3. Edit the .env file to set production values:

   ```bash
   nano .env
   ```

   Add or update these values:

   ```
   DJANGO_SECRET_KEY=your_generated_key
   ALLOWED_HOSTS=your-domain.com,www.your-domain.com
   DEBUG=0
   ```

4. Build and start the production containers:

   ```bash
   make prod-up
   ```

5. Access your application at your domain or server IP

### Production Updates

To update the production deployment with the latest code:

1. Pull the latest changes:

   ```bash
   git pull
   ```

2. Rebuild and restart the containers:
   ```bash
   make prod-down
   make prod-up
   ```

## Database Management

### Backup Database

```bash
make backup-db
```

### Restore Database

```bash
make restore-db DB_FILE=backups/db-20250313123456.sqlite3
```

## Available Make Commands

Run `make help` to see all available commands:

- `make dev-up` - Start development environment
- `make dev-down` - Stop development environment
- `make prod-up` - Start production environment
- `make prod-down` - Stop production environment
- `make migrate` - Run database migrations
- `make backup-db` - Backup the database
- `make restore-db DB_FILE=file` - Restore a database backup
- `make generate-key` - Generate a new Django secret key
- `make clean` - Clean up temporary files
- `make format` - Format code with ruff
- `make lint` - Run linters

## Project Structure

```
discocatdjango/
├── backend/                # Django project
│   ├── evaluator/          # Main Django app
│   │   ├── settings/       # Settings directory
│   │   │   ├── base.py     # Base settings
│   │   │   ├── development.py # Development settings
│   │   │   └── production.py # Production settings
│   ├── users/              # Users app
│   ├── voting/             # Voting app
│   ├── Dockerfile          # Production Dockerfile
│   ├── Dockerfile.dev      # Development Dockerfile
│   ├── entrypoint.sh       # Production entrypoint
│   ├── entrypoint.dev.sh   # Development entrypoint
│   ├── requirements.txt    # Production requirements
│   └── requirements.dev.txt # Development requirements
├── database/               # SQLite database directory
├── docker-compose.yml      # Production Docker Compose
├── docker-compose.dev.yml  # Development Docker Compose
├── nginx.conf              # Nginx configuration
├── .env                    # Environment variables (not in git)
├── .gitignore              # Git ignore file
├── Makefile                # Make commands
├── pyproject.toml          # Python project metadata
└── README.md               # This file
```
