# SmartCollab Frontend

A React-based multi-tenant collaboration platform that integrates with WhatsApp and Instagram, built on Supabase for backend services.

## Features

- Multi-tenant architecture with organization isolation
- User roles and permissions management
- Real-time messaging in channels and direct chats
- WhatsApp and Instagram integration
- i18n support for internationalization

## Tech Stack

- **React** with TypeScript
- **Tailwind CSS** for styling
- **React Router** for navigation
- **React Context API** for state management
- **i18next** for translations
- **React Hook Form** for form validation
- **Supabase Client SDK** for auth, real-time, and data

## Getting Started

### Prerequisites

- Node.js 14+ and npm
- Supabase project with the appropriate schema

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```
3. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
4. Update the `.env` file with your Supabase credentials:
   ```
   REACT_APP_SUPABASE_URL=your-supabase-project-url
   REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```
5. Start the development server:
   ```bash
   npm start
   ```

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── common/       # Buttons, inputs, etc.
│   ├── layout/       # Layout components
│   ├── auth/         # Auth-related components
│   ├── org/          # Organization components
│   └── messaging/    # Messaging components
├── contexts/         # Context providers
├── hooks/            # Custom hooks
├── locales/          # Translation files
├── pages/            # Main application pages
├── services/         # API service functions
├── types/            # TypeScript interfaces
└── utils/            # Helper functions
```

## Missing Dependencies

If you encounter missing dependency errors, install them using:

```bash
npm install --save i18next-browser-languagedetector @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

## Development Notes

- All Supabase client operations are wrapped in custom hooks
- Authentication state is managed through AuthContext
- Organization data is managed through OrgContext
- Routes are protected based on authentication state
- Form validation uses React Hook Form
- UI is fully responsive for mobile and desktop

## License

This project is licensed under the MIT License.
