
# Environment Configuration Guide

## Overview

This guide provides comprehensive instructions for setting up environment variables for development and production deployments.

## Quick Setup

1. **Copy the template**: `cp .env.example .env`
2. **Update values**: Edit `.env` with your actual configuration
3. **Restart server**: Restart your development server after changes

## Required Variables

### Supabase Configuration

#### `VITE_SUPABASE_URL`
- **Description**: Your Supabase project URL
- **Format**: `https://[project-ref].supabase.co`
- **Where to find**: Supabase Dashboard > Settings > API > Project URL
- **Example**: `https://abcdefghijklmnop.supabase.co`

#### `VITE_SUPABASE_ANON_KEY`
- **Description**: Supabase anonymous public key (safe for frontend)
- **Format**: JWT token starting with `eyJ`
- **Where to find**: Supabase Dashboard > Settings > API > Project API keys > anon public
- **Security**: Safe to expose in frontend code

#### `VITE_EMERGENCY_SUPABASE_URL`
- **Description**: Optional Supabase project URL dedicated to emergency dashboards
- **Format**: `https://[project-ref].supabase.co`
- **Where to find**: Supabase Dashboard > Settings > API > Project URL
- **Fallback**: Defaults to `VITE_SUPABASE_URL` when not provided

#### `VITE_EMERGENCY_SUPABASE_ANON_KEY`
- **Description**: Anonymous key for the emergency Supabase project
- **Format**: JWT token starting with `eyJ`
- **Where to find**: Supabase Dashboard > Settings > API > Project API keys > anon public
- **Fallback**: Defaults to `VITE_SUPABASE_ANON_KEY` when not provided

### Application Configuration

#### `VITE_API_BASE_URL`
- **Description**: Base URL for your deployed application
- **Development**: `http://localhost:8080`
- **Production**: Your deployed app URL
- **Examples**:
  - Vercel: `https://your-app.vercel.app`
  - Netlify: `https://your-app.netlify.app`
  - Custom domain: `https://your-domain.com`

## Optional Variables

### Storage Configuration

#### `VITE_STORAGE_COMPANY_LOGOS_BUCKET`
- **Description**: Supabase storage bucket for company logos
- **Default**: `company-logos`
- **Setup**: Create bucket in Supabase Dashboard > Storage

#### `VITE_STORAGE_RECORDINGS_BUCKET`
- **Description**: Supabase storage bucket for call recordings
- **Default**: `recordings`
- **Setup**: Create bucket in Supabase Dashboard > Storage

### Feature Flags

#### `VITE_ENABLE_ANALYTICS`
- **Description**: Enable analytics dashboard features
- **Values**: `true` | `false`
- **Default**: `true`

#### `VITE_ENABLE_USER_PROFILES`
- **Description**: Enable user profile management
- **Values**: `true` | `false`
- **Default**: `true`

#### `VITE_EMAIL_ENABLED`
- **Description**: Enable email functionality
- **Values**: `true` | `false`
- **Default**: `true`
- **Requirements**: Requires Supabase email configuration

## Environment-Specific Setup

### Development Environment

```bash
# .env (development)
VITE_SUPABASE_URL=https://your-dev-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-dev-anon-key
# Optional: point emergency dashboards to a separate Supabase project
# VITE_EMERGENCY_SUPABASE_URL=https://your-emergency-dev-project.supabase.co
# VITE_EMERGENCY_SUPABASE_ANON_KEY=your-emergency-dev-anon-key
VITE_API_BASE_URL=http://localhost:8080
VITE_STORAGE_COMPANY_LOGOS_BUCKET=company-logos-dev
VITE_STORAGE_RECORDINGS_BUCKET=recordings-dev
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_USER_PROFILES=true
VITE_EMAIL_ENABLED=false
```

### Production Environment

```bash
# .env (production)
VITE_SUPABASE_URL=https://your-prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-prod-anon-key
# Optional: configure dedicated emergency Supabase credentials
# VITE_EMERGENCY_SUPABASE_URL=https://your-emergency-prod-project.supabase.co
# VITE_EMERGENCY_SUPABASE_ANON_KEY=your-emergency-prod-anon-key
VITE_API_BASE_URL=https://your-app.vercel.app
VITE_STORAGE_COMPANY_LOGOS_BUCKET=company-logos
VITE_STORAGE_RECORDINGS_BUCKET=recordings
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_USER_PROFILES=true
VITE_EMAIL_ENABLED=true
```

## Deployment Checklist

### Pre-Deployment

- [ ] Create production Supabase project
- [ ] Update environment variables with production values
- [ ] Test all features with production configuration
- [ ] Verify storage buckets are created
- [ ] Configure email templates in Supabase
- [ ] Test authentication flows

### Post-Deployment

- [ ] Verify application loads correctly
- [ ] Test authentication functionality
- [ ] Verify database connections
- [ ] Test file upload features (if applicable)
- [ ] Monitor for environment-related errors

## Security Best Practices

### General Security

1. **Never commit `.env` files** to version control
2. **Use different projects** for development and production
3. **Regularly rotate API keys** and tokens
4. **Monitor access logs** in Supabase dashboard

### Variable Security

- **VITE_ prefixed variables**: Exposed to browser (use only for public data)
- **Service role keys**: Never use in frontend (backend only)
- **Environment separation**: Use different values for dev/staging/prod

## Troubleshooting

### Common Issues

#### "Missing environment variables" error
- **Cause**: Required variables not set or invalid format
- **Solution**: Check `.env` file and restart development server

#### "Invalid Supabase credentials" error
- **Cause**: Incorrect URL or anon key
- **Solution**: Verify values in Supabase Dashboard > Settings > API

#### "Storage bucket not found" error
- **Cause**: Bucket doesn't exist in Supabase
- **Solution**: Create bucket in Supabase Dashboard > Storage

#### "CORS errors" in production
- **Cause**: Incorrect `VITE_API_BASE_URL`
- **Solution**: Ensure URL matches your deployed application

### Validation

The application includes built-in environment validation that will:
- Check for required variables
- Validate URL formats
- Verify Supabase credentials
- Provide setup hints for missing configuration

## Support

If you encounter issues with environment setup:

1. Check the built-in validation messages
2. Review this documentation
3. Verify your Supabase project settings
4. Check browser developer console for errors
5. Ensure all required storage buckets are created

## Related Documentation

- [Supabase Documentation](https://supabase.com/docs)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Deployment Guide](./DEPLOYMENT.md) (if available)
