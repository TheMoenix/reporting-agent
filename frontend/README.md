# Reporting Agent Frontend

React-based web application for AI-powered SQL reporting interface.

## Tech Stack

- **Framework**: React 19.x
- **UI Library**: Ant Design 5.x
- **API**: Apollo Client (GraphQL)
- **Language**: TypeScript
- **Build Tool**: CRACO (Create React App Configuration Override)

## Key Dependencies

- `react` - React library
- `antd` - Ant Design UI components
- `@ant-design/x` - Ant Design extended components
- `@apollo/client` - GraphQL client
- `react-router-dom` - Routing
- `recharts` - Data visualization
- `graphql-ws` - GraphQL subscriptions
- `i18next` - Internationalization (AR/EN)
- `styled-components` - CSS-in-JS styling
- `markdown-it` - Markdown rendering

## Development

```bash
npm install
npm start
```

Runs on http://localhost:3000

## Build

```bash
npm run build
```

## Code Generation

GraphQL types are auto-generated:

```bash
npm run codegen
```
