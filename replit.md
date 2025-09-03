# RSS Feed Automation Platform

## Overview

This is a full-stack RSS feed automation platform built with React, Express, and TypeScript. The application allows users to manage RSS feeds, automatically generate AI-powered summaries, and send those summaries via email on a scheduled basis. It features a modern dashboard interface with real-time status monitoring, comprehensive feed management, email configuration, and activity logging capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack React Query for server state management
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **API Design**: RESTful API with JSON responses
- **Error Handling**: Centralized error middleware
- **Development**: Hot module replacement with Vite middleware in development

### Data Storage Solutions
- **Primary Database**: PostgreSQL configured through Drizzle ORM
- **Database Provider**: Neon Database (@neondatabase/serverless)
- **Schema Management**: Drizzle Kit for migrations and schema management
- **In-Memory Fallback**: MemStorage class for development/testing

### Authentication and Authorization
- **Session Management**: Express sessions with PostgreSQL session store (connect-pg-simple)
- **Security**: Ring-offset focus management and CSRF protection through session handling

### External Service Integrations
- **RSS Parsing**: Custom RSS service using rss-parser library
- **AI Summarization**: OpenAI GPT-5 integration for content summarization
- **Email Service**: Nodemailer with SMTP configuration support
- **Scheduling**: Node-cron for automated RSS processing and summary generation
- **Real-time Updates**: TanStack Query for automatic data refetching

### Key Architectural Decisions

**Monorepo Structure**: The application uses a unified TypeScript configuration with shared schemas between client and server, enabling type safety across the full stack while maintaining separation of concerns.

**Component-Based UI**: Built on Shadcn/ui for consistent design system with Radix UI primitives providing accessibility and behavior, while Tailwind CSS handles styling with custom CSS variables for theming.

**Service Layer Pattern**: Backend services are organized into dedicated modules (RSS, Email, Summary, Scheduler) that handle specific business logic and can be easily tested and maintained independently.

**Query-Driven Frontend**: Uses TanStack React Query for server state management, providing automatic caching, background updates, and optimistic updates for a responsive user experience.

**Type-Safe Database Layer**: Drizzle ORM with Zod schemas ensures type safety from database to API responses, with shared schema definitions preventing type mismatches between frontend and backend.