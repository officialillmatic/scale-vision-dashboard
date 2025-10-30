
# Dr. Scale Platform Maintenance Guide

## Architecture Overview

The Dr. Scale platform consists of:

1. React frontend with TypeScript
2. Supabase backend with PostgreSQL and Edge Functions
3. Integration with Retell.ai for AI agent functionality

## Key Components

### Permissions System

The platform uses a role-based permissions system implemented in `src/hooks/useRole.ts`. The roles are:

- `admin`: Full access to all features
- `member`: Standard user access, can use assigned agents and manage their own calls
- `viewer`: Limited access, read-only for most features

### Balance and Billing

The billing system is implemented in the `src/services/balance` directory:

- `balanceBaseService.ts`: Core functionality for user balances
- `transactionService.ts`: Transaction history and recording
- `balanceOperations.ts`: Balance update operations
- `calculationUtils.ts`: Utility functions for cost calculations

### Supabase Edge Functions

The platform uses several Edge Functions for backend operations:

- `send-invitation`: Send invitations to new users
- `admin-update-balance`: Update user balances (admin only)
- `fetch-retell-calls`: Fetch call data from Retell API
- `enforce-agent-permissions`: Enforce agent access permissions

### Storage Buckets

Three storage buckets are used:

- `avatars`: User profile avatars
- `company-logos`: Company logos
- `recordings`: Call recordings

## Common Maintenance Tasks

### Adding New Permissions

1. Add the permission to the `can` object in `src/hooks/useRole.ts`
2. Use the permission in components with `useRole().can.permissionName`

### Updating Billing Logic

1. Modify the appropriate file in `src/services/balance`
2. Ensure transaction recording is properly implemented
3. Update any affected UI components

### Troubleshooting Storage Issues

If storage uploads fail:

1. Verify RLS policies are correctly set
2. Check user permissions
3. Ensure storage buckets exist

### Adding New Edge Functions

1. Create a new function in `supabase/functions/{function-name}/index.ts`
2. Include appropriate CORS headers
3. Add proper error handling
4. Test using the Supabase dashboard

## Production Deployment Checklist

- [ ] Verify all environment variables are set
- [ ] Test all user roles and permissions
- [ ] Verify Retell.ai integration is working
- [ ] Ensure billing systems function correctly
- [ ] Check storage buckets and permissions
- [ ] Test email sending functionality
- [ ] Review error handling for all API calls
