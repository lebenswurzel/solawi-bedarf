# SoLawi Bedarf App

## Licensing

This project is licensed under the GNU Affero General Public License v3.0 (AGPLv3).
See [COPYING](./COPYING) for details.

Some files that are included in this project contain work that is licensed under different licenses:

- [vfs_fonts.ts](http://pdfmake.org/#/) in `frontend/src/assets/vfs_fonts.ts`
- [aubergine.svg](https://github.com/mozilla/fxemoji/blob/gh-pages/svgs/objects/u1F346-aubergine.svg) by Mozilla in `frontend/public/aubergine.svg` is licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

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

## Glossary

stock: g/ml/Stk
