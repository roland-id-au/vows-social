# Development Notes

## Git Workflow Improvements

### Use Git Worktrees for Parallel Development

Instead of switching branches and losing uncommitted work, use worktrees:

```bash
# Create a new worktree for a feature
git worktree add ../vows-social-feature feature/new-feature

# Work in the new directory
cd ../vows-social-feature

# When done, remove the worktree
git worktree remove ../vows-social-feature
```

**Benefits:**
- Multiple branches checked out simultaneously
- No need to stash/commit incomplete work when switching contexts
- Can run different dev servers on different ports
- Easier to compare implementations side-by-side

**Typical Setup:**
```bash
# Main development
/vows_social (main branch)

# Feature work
/vows_social-feature (feature branch worktree)

# Hotfix
/vows_social-hotfix (hotfix branch worktree)
```

## Database Management

### Local Development

```bash
# Fresh start
npm run db:reset

# Clear data only
npm run db:clear

# Check status
npm run supabase:status
```

### Remote Database

Use Supabase Dashboard or SQL Editor for production changes.
Never run destructive commands against production.

## Common Tasks

### Testing Discovery Flow

```bash
# 1. Clear local database
npm run db:clear

# 2. Run discovery
curl -X POST \
  http://localhost:54321/functions/v1/deep-research-venue \
  -H "Authorization: Bearer $(supabase status | grep 'service_role key' | cut -d':' -f2 | xargs)" \
  -d '{"venueName":"Test","location":"Sydney","city":"Sydney","state":"NSW"}'

# 3. Check results
psql $(supabase status | grep 'DB URL' | cut -d':' -f2- | xargs)
```

### Deploying Changes

```bash
# 1. Deploy functions
supabase functions deploy

# 2. Apply migrations
supabase db push

# 3. Deploy web
git push origin main  # Auto-deploys via Vercel
```

## Notes

- Always test migrations locally before pushing
- Use meaningful commit messages
- Document breaking changes
- Keep README up to date
