# SmartCollab

SmartCollab is a collaborative platform built with React, TypeScript, and Supabase, designed to help teams manage their projects and communications effectively.

## Features

- 🔐 Secure authentication with Supabase
- 👥 Organization management
- 💬 Real-time messaging
- 🌐 Internationalization support
- 🎨 Modern UI with Tailwind CSS

## Tech Stack

- Frontend:
  - React
  - TypeScript
  - Tailwind CSS
  - React Router v6
  - i18next for internationalization
  - React Hook Form for form management

- Backend:
  - Supabase
  - PostgreSQL

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/smartcollab.git
cd smartcollab
```

2. Install dependencies:
```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

3. Set up environment variables:
Create a `.env` file in the frontend directory with the following variables:
```
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server:
```bash
cd frontend
npm start
```

## Project Structure

```
smartcollab/
├── frontend/           # React frontend application
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── contexts/   # React context providers
│   │   ├── pages/      # Page components
│   │   ├── types/      # TypeScript type definitions
│   │   └── i18n/       # Internationalization files
│   └── public/         # Static assets
├── backend/           # Backend scripts and configurations
└── Execution Plans/   # Project execution plans
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 