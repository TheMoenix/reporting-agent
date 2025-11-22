# Reporting Agent Backend

NestJS backend service with GraphQL API for AI-powered SQL reporting.

## Tech Stack

- **Framework**: NestJS 11.x
- **API**: GraphQL (Apollo Server)
- **AI/ML**: LangChain, LangGraph, OpenAI, Anthropic
- **Databases**: PostgreSQL, MongoDB, ClickHouse, Redis
- **Language**: TypeScript

## Key Dependencies

- `@nestjs/graphql` - GraphQL integration
- `@nestjs/apollo` - Apollo Server
- `langchain` - LangChain framework
- `@langchain/langgraph` - Graph-based agent workflows
- `@langchain/openai` - OpenAI integration
- `@langchain/anthropic` - Anthropic integration
- `typeorm` - PostgreSQL ORM
- `mongoose` - MongoDB ODM
- `ioredis` - Redis client
- `@clickhouse/client` - ClickHouse client
- `xlsx` - Excel export

## Development

```bash
npm install
npm run start:dev
```

## Build

```bash
npm run build
npm run start:prod
```
