# Development

When adding new files, don't forget to add the AGPLv3 header to it. This can be done
by executing `./apply_license_headers.bash` in the project root (requires python3).

## Generate migrations

```
npm run typeorm -- migration:generate -d ./src/database/database.ts ./src/migrations/<migrationname>
```

## Pre commit hook

[pre-commit](https://pre-commit.com/) may be used to ensure code quality already when commiting. One-time setup:

```
pip3 install pre-commit
pre-commit install

# if not done already, make sure that npm dependencies are installed in /frontend and /backend
```

Hooks are defined in [pre-commit-config.yaml](./pre-commit-config.yaml).

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
npm run test
```

## Deployment

This should be done during a time with low expected user activity.

On the production server:

1. Check out the desired branch or tag
2. Run `./dev/build/build-and-deploy.bash` from the project root to build up-to-date containers locally
   - This will also trigger a database backup to the /backups folder in the container. Make sure a host
     folder with permissions 0777 is mounted from the host so that user 'postgres' in the container
     can write to it!
3. Run `docker compose up -d` to start

## Glossary

stock: g/ml/Stk

## Database Schemas

### After 'order-valid-from.ts' migration

![Schema V4](./res/database-schema-v4.png)
