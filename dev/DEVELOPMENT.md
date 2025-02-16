# Development

When adding new files, don't forget to add the AGPLv3 header to it. This can be done
by executing `./apply_license_headers.bash` in the project root (requires python3).

## Running locally

The easiest development approach is to just start the db container in docker. The frontend and backend can then be run as follows

### Backend without Docker

- Create a copy of the `env-be-dev.env` file to `env-be-localdev.env` with a few adjustments
  - `POSTGRES_URL=localhost`
  - `POSTGRES_PORT=5532`
- Initialize the environment from it
  - `set -a; source env-be-localdev.env; set +a`
- Start the server with the UTC time zone in order to have consistent date behavior with the docker container

```
cd backend
TZ=UTC npm run start
```

### Frontend without Docker

```
cd frontend
npm run dev
```

## Generate migrations

If database tables are changed or added, typeorm can automatically generate migration scripts

1. Make desired adjustments to the tables in `backend/src/database/TABLENAME.ts`
2. Generate migration script (naming scheme: `use-dashes-as-separator`)

```
npm run typeorm -- migration:generate -d ./src/database/database.ts ./src/migrations/<migrationname>
```

3. Verify the newly generated script and make manual adjustments for data updates, if necessary
4. Add the new migration script to the `migrations` array in `backend/src/database/database.ts`
5. Restart the backend server

## Pre commit hook

[pre-commit](https://pre-commit.com/) may be used to ensure code quality already when commiting. One-time setup:

```
pip3 install pre-commit
pre-commit install

# if not done already, make sure that npm dependencies are installed in /frontend and /backend
```

Hooks are defined in [pre-commit-config.yaml](../.pre-commit-config.yaml).

## Testing

### CI

This project uses Github Actions for CI. To run all tests locally use https://github.com/nektos/act

When using [Github CLI](https://cli.github.com/) run

```
# installation
gh extension install https://github.com/nektos/gh-act

# running workflow scripts
gt act
```

### Backend tests

For local testing a Postgres container must be started (default port 5533):

```
docker compose -f compose-testing.yaml up
```

To start the live test server run

```
cd backend
TZ=UTC npm run test
```

## Releasing

A new release in Github can be created using the helper script `./dev/new-release.bash`.

Make sure to include all relevant changes and release notes in the `# NEW` section in `CHANGELOG.md`

The script will ask for a tag name, release title and will commit, push and create the release in
Github using the [Github CLI](https://cli.github.com/).

## Glossary

todo

## Database Schemas

### V4: After 'order-valid-from.ts' migration

![Schema V4](./res/database-schema-v4.png)
