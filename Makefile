.PHONY: help install dev-setup lint test format run build deploy clean update-deps migrate backup-db restore-db dev-up dev-down prod-up prod-down

# Include environment variables from .env file
-include .env

# Colors for terminal output
RESET = \033[0m
BLUE = \033[34m
GREEN = \033[32m
YELLOW = \033[33m

help: ## Show this help
	@grep -h -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(BLUE)%-20s$(RESET) %s\n", $$1, $$2}'

install: ## Install dependencies
	@echo "$(GREEN)Installing dependencies...$(RESET)"
	uv pip install -e .

dev-setup: ## Set up development environment
	@echo "$(GREEN)Setting up development environment...$(RESET)"
	uv pip install -e ".[dev]"
	pre-commit install

lint: ## Run linters (ruff)
	@echo "$(GREEN)Running linters...$(RESET)"
	ruff check .

format: ## Format code
	@echo "$(GREEN)Formatting code...$(RESET)"
	ruff format .

update-deps: ## Update dependencies
	@echo "$(GREEN)Updating dependencies...$(RESET)"
	uv pip compile pyproject.toml -o backend/requirements.txt

dev-up: setup ## Run service in development mode
	@echo "$(GREEN)Running service in development mode...$(RESET)"
	docker-compose -f docker-compose.dev.yml up -d

dev-down: ## Stop service in development mode
	@echo "$(GREEN)Stopping service in development mode...$(RESET)"
	docker-compose -f docker-compose.dev.yml down

prod-up: setup ## Run service in production mode
	@echo "$(GREEN)Running service in production mode...$(RESET)"
	docker-compose up -d

prod-down: ## Stop service in production mode
	@echo "$(GREEN)Stopping service in production mode...$(RESET)"
	docker-compose down

build-dev: ## Build the development docker image
	@echo "$(GREEN)Building development docker image...$(RESET)"
	docker-compose -f docker-compose.dev.yml build

build-prod: ## Build the production docker image
	@echo "$(GREEN)Building production docker image...$(RESET)"
	docker-compose build

deploy: ## Deploy the service (placeholder)
	@echo "$(YELLOW)Deploy script not implemented yet.$(RESET)"

clean: ## Clean up generated files
	@echo "$(GREEN)Cleaning up...$(RESET)"
	rm -rf .pytest_cache .ruff_cache __pycache__ dist build
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type d -name "*.egg-info" -exec rm -rf {} +

docs-serve: ## Serve documentation locally
	@echo "$(GREEN)Serving documentation...$(RESET)"
	mkdocs serve

docs-build: ## Build documentation
	@echo "$(GREEN)Building documentation...$(RESET)"
	mkdocs build

# DataBase block
setup:
	mkdir -p database

migrate: setup ## Run Django migrations
	cd backend && python manage.py makemigrations && python manage.py migrate && cd ..

backup-db: ## Backup the database
	@mkdir -p backups
	@cp database/db.sqlite3 backups/db-$(shell date +%Y%m%d%H%M%S).sqlite3
	@echo "Database backed up to backups/"

restore-db: ## Restore a database backup (provide DB_FILE)
	@if [ -z "$(DB_FILE)" ]; then echo "Usage: make restore-db DB_FILE=backups/filename.sqlite3"; exit 1; fi
	@cp $(DB_FILE) database/db.sqlite3
	@echo "Database restored from $(DB_FILE)"

generate-key: ## Generate a new Django secret key
	@echo "$(GREEN)Generating secret key...$(RESET)"
	@python -c "from django.core.management.utils import get_random_secret_key; print(f'Add this to your .env file: DJANGO_SECRET_KEY={get_random_secret_key()}')"

create-env: ## Create a .env file with a new secret key
	@if [ -f .env ]; then \
		echo "$(YELLOW).env file already exists. Rename or remove it first.$(RESET)"; \
	else \
		echo "$(GREEN)Creating .env file with a new secret key...$(RESET)"; \
		SECRET_KEY=$$(python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"); \
		echo "DJANGO_SECRET_KEY=$$SECRET_KEY" > .env; \
		echo "ALLOWED_HOSTS=localhost,127.0.0.1" >> .env; \
		echo "DB_PATH=/database/db.sqlite3" >> .env; \
		echo "$(GREEN).env file created with a new secret key.$(RESET)"; \
	fi
