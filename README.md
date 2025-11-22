# Reporting Agent

An AI-powered SQL reporting agent that helps users query databases using natural language.

## Quick Start

1. Clone the repository
2. Configure environment variables (see below)
3. Run with Docker Compose:

```bash
docker-compose up
```

Access the application:

- Frontend: http://localhost:3000
- Backend GraphQL: http://localhost:4000/graphql

## Required Environment Variables

Create a `.env` file in the root directory with these required variables:

```env
# AI Services (Required)
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# AWS S3 (Required for file exports)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET=your_s3_bucket_name

# LangSmith (Optional - for tracing)
LANGSMITH_API_KEY=your_langsmith_api_key
```

All other variables have defaults in `docker-compose.yml`, but can be overridden in the `.env` file.

## Project Structure

- `/backend` - NestJS backend service
- `/frontend` - React frontend application

See individual README files in each directory for details.

## Contributing

Contributions are welcome! Please open issues and pull requests on GitHub.

## License

MIT
