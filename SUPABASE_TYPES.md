# Supabase Types Generation

This project includes scripts to automatically generate TypeScript types from your Supabase database schema.

## Available Scripts

### Generate Types

```bash
npm run supabase-types
```

This command generates TypeScript types from your Supabase database and saves them to `pages/types/database.types.ts`.

### Update Types with Confirmation

```bash
npm run supabase-types:update
```

This command generates the types and shows a success message.

## How It Works

1. **Connects to Supabase**: Uses your project ID (`pgvgcudsrcxlxyqdrzlx`) to connect to your Supabase instance
2. **Generates Types**: Creates TypeScript definitions for all your database tables, views, functions, and enums
3. **Saves to File**: Outputs the types to `pages/types/database.types.ts`

## Generated Types Include

- **Table Types**: Row, Insert, and Update types for all tables
- **View Types**: Types for database views
- **Function Types**: Types for database functions
- **Enum Types**: Types for database enums
- **Helper Types**: Utility types for working with the database

## Usage in Code

After generating types, you can use them in your TypeScript code:

```typescript
import { Database } from "./types/database.types";

// Use the generated types
type Token = Database["public"]["Tables"]["tokens"]["Row"];
type TokenInsert = Database["public"]["Tables"]["tokens"]["Insert"];
```

## When to Run

Run these scripts whenever you:

- Add new tables to your database
- Modify existing table schemas
- Add new views or functions
- Change column types or constraints

## Prerequisites

- Supabase CLI installed (`npm install -g supabase`)
- Access to your Supabase project
- Project ID configured in the script

## Troubleshooting

If you get authentication errors:

1. Make sure you're logged in to Supabase CLI: `supabase login`
2. Verify your project ID is correct
3. Check that you have access to the project

## Integration with Existing Code

The generated types will automatically work with your existing Supabase service files:

- `pages/lib/supabase.ts` - Uses the generated types
- `pages/services/supabaseService.ts` - Imports and uses the types
- `pages/services/tokenService.ts` - Uses the types for token operations
