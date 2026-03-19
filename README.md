## Database Auto-Creation From Entities

The project is configured to auto-create MySQL tables from entities when running in non-production by default.

### Current Rule

- NODE_ENV=production: `DB_SYNC` default is `false`
- NODE_ENV!=production: `DB_SYNC` default is `true`
- You can force behavior by setting `DB_SYNC=true` or `DB_SYNC=false`

### Required .env Values

- `DB_HOST`
- `DB_PORT`
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_NAME`
- `NODE_ENV`
- `DB_SYNC`

### Quick Start For Recreating Tables

1. Ensure database schema exists (for example: `we_connect`).
2. Set `.env` with `NODE_ENV=development` and `DB_SYNC=true`.
3. Run the app (`npm run start:dev`).
4. TypeORM will create missing tables from loaded entities.

### Checklist If Tables Are Not Created

1. Verify app can connect to MySQL using `.env` values.
2. Confirm `DB_NAME` database exists. TypeORM sync creates tables, not database schema itself.
3. Confirm `DB_SYNC=true` (or `NODE_ENV` is not production and `DB_SYNC` is unset).
4. Confirm entities are loaded through module imports and `TypeOrmModule.forFeature(...)`.
5. Confirm MySQL user has CREATE and ALTER privileges.
6. Check startup logs for TypeORM connection errors.

### Production Note

Set `NODE_ENV=production` and `DB_SYNC=false`, then manage schema using migrations.

