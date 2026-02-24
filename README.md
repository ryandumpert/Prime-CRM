# Prime Loan Advisors CRM

A lightweight, advisor-first CRM optimized for **Non-QM (non-qualified mortgage)** lead follow-up. Built with Next.js 14, PostgreSQL, and Prisma.

## Features

### Lead Management
- **Import leads** from Excel/CSV spreadsheets with automatic field mapping
- **Advisor assignment** via Column L in spreadsheet imports
- **Deduplication** based on email → phone → external row ID priority
- **Status tracking** with enforced status flow transitions

### Daily Call List
- Automatically surfaces leads **not contacted in the last 5 days**
- Priority-based sorting (High → Normal → Low)
- Calling session mode with auto-advance
- Quick disposition logging

### Lead Workspace
- **One-click contact actions**: Call, Email, Text (with deep links)
- Activity timeline with full interaction history
- Status updates with validation
- Compliance flags (Do Not Call/Text/Email)
- Next action date scheduling

### Reporting & Admin
- Pipeline status distribution
- Advisor performance metrics
- Contact/attempt tracking
- User management with role-based access

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS 4 with glassmorphism dark theme
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with credentials provider
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd prime-crm
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and configure:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
   - `NEXTAUTH_URL`: Your app URL (http://localhost:3000 for development)

4. **Set up the database**
   ```bash
   # Push schema to database
   npm run db:push
   
   # Seed with initial data (admin + 4 advisors + sample leads)
   npm run db:seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open the app**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@theprimeloanadvisors.com | admin123 |
| Advisor | john.smith@theprimeloanadvisors.com | advisor123 |
| Advisor | sarah.johnson@theprimeloanadvisors.com | advisor123 |
| Advisor | michael.chen@theprimeloanadvisors.com | advisor123 |
| Advisor | emily.davis@theprimeloanadvisors.com | advisor123 |

## Lead Status Flow

The CRM enforces the following status progression:

```
NEW → ATTEMPTED_CONTACT → CONTACTED → PREQUAL_IN_PROGRESS → DOCS_REQUESTED
      → DOCS_RECEIVED → SUBMITTED_TO_LENDER → UNDERWRITING
      → CONDITIONAL_APPROVAL → CLEAR_TO_CLOSE → CLOSED_FUNDED
```

**Terminal statuses** (removed from call list):
- CLOSED_FUNDED
- NOT_INTERESTED
- UNQUALIFIED
- LOST
- DO_NOT_CONTACT

## Importing Leads

1. Navigate to **Import Leads** (Admin only)
2. Upload your spreadsheet (Excel or CSV)
3. Ensure:
   - First row contains column headers
   - **Column L** contains advisor assignment (name or email)
   - Phone/email are present for contact

### Recognized Headers

| CRM Field | Recognized Headers |
|-----------|-------------------|
| First Name | first name, firstname, first_name |
| Last Name | last name, lastname, last_name |
| Full Name | name, full name, fullname |
| Phone | phone, mobile, cell, primary phone |
| Email | email, email address, e-mail |
| Advisor | **Column L** (matches by name or email) |

## API Endpoints

### Authentication
- `POST /api/auth/[...nextauth]` - NextAuth.js handler

### Leads
- `GET /api/leads` - List leads (with filtering, pagination)
- `POST /api/leads` - Create lead (Admin)
- `GET /api/leads/[id]` - Get lead with interactions
- `PATCH /api/leads/[id]` - Update lead
- `DELETE /api/leads/[id]` - Delete lead (Admin)

### Interactions
- `GET /api/leads/[id]/interactions` - Get lead timeline
- `POST /api/leads/[id]/interactions` - Log interaction

### Import
- `POST /api/import` - Import spreadsheet (Admin)
- `GET /api/import` - Get import history (Admin)

### Users
- `GET /api/users` - List users (Admin)
- `POST /api/users` - Create user (Admin)
- `PATCH /api/users/[id]` - Update user (Admin)
- `DELETE /api/users/[id]` - Deactivate user (Admin)

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

## Production Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

3. **Start the production server**
   ```bash
   npm start
   ```

### Environment Variables for Production

```env
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-production-secret"
NODE_ENV="production"
```

## Database Management

```bash
# Generate Prisma client
npm run db:generate

# Push schema changes
npm run db:push

# Run migrations
npm run db:migrate

# Seed database
npm run db:seed

# Open Prisma Studio
npm run db:studio

# Reset database
npm run db:reset
```

## Project Structure

```
prime-crm/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Seed script
├── src/
│   ├── app/
│   │   ├── (dashboard)/   # Protected routes
│   │   │   ├── dashboard/
│   │   │   ├── leads/
│   │   │   ├── call-list/
│   │   │   ├── import/
│   │   │   ├── users/
│   │   │   ├── reports/
│   │   │   └── settings/
│   │   ├── api/           # API routes
│   │   ├── login/
│   │   └── layout.tsx
│   ├── components/
│   │   ├── layout/        # Sidebar, Header
│   │   └── ui/            # Reusable components
│   └── lib/
│       ├── auth.ts        # Auth helpers
│       ├── constants.ts   # Status enums, transitions
│       ├── db.ts          # Prisma client
│       ├── types.ts       # TypeScript types
│       └── utils.ts       # Utility functions
├── agent.md               # Build agent instructions
├── blueprint.md           # Product specification
└── README.md
```

## Specification Documents

- **agent.md**: Build execution instructions for the Anti-Gravity agent
- **blueprint.md**: Complete product requirements and data model specification

## License

Proprietary - Prime Loan Advisors
