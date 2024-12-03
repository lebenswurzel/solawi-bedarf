# SoLawi Bedarf App

This app helps to manage products, clients and deliveries for a community supported agriculture.

## Licensing

This project is licensed under the GNU Affero General Public License v3.0 (AGPLv3).
See [COPYING](./COPYING) for details.

Some files that are included in this project contain work that is licensed under different licenses:

- [vfs_fonts.ts](http://pdfmake.org/#/) in `frontend/src/assets/vfs_fonts.ts`
- [seedling.svg](https://github.com/mozilla/fxemoji/blob/gh-pages/svgs/nature/u1F331-seedling.svg) by Mozilla in `frontend/public/assets/seedling.svg` is licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

## Usage

### Initial Deployment

The app is deployed via Docker Compose based on `compose.yaml`. The following manual steps are necessary
for the first time setup:

1. Check out the desired branch or tag
2. Create copies of the files env files:
   - `env-be-dev.env` -> `env-be-prod.env`
   - `env-db-dev.env` -> `env-db-prod.env`
3. Adjust the values based on your environment.
   IMPORTANT: The following values should definitely be changed
   - POSTGRES_PASSWORD
   - POSTGRES_SECRET
   - INITIAL_PASSWORD
   - JWT_SECRET
   - EMAIL\_\*
4. (optional) Copy of `.env-sample` to `.env` and adjust the external ports for the different containers
5. Run `./dev/build/build-and-deploy.bash init` from the project root to build containers locally
6. If everything looks fine, run `docker compose up d` to start

### Backups

It is advised to schedule regular database backups, e.g., using cron:

`0 3 * * * /path/to/repo/dev/backup/database-backup.bash`

This will create backups in the folder `./database/backups` which is mounted into the database container.

Also make sure to have backups of your custom .env files, especially the SECRETs.

For managing backup retention, a helper script can be found in `./dev/backup/cleanup_backups_script.sh`.

You may set up a crontab rule to daily execute this script in the database container:

`10 3 * * * /path/to/repo/dev/backup/database-clean-backups.bash`

### Updating

This should be done during a time with low expected user activity. You may consider notifying the user about
planned downtimes by setting a maintenance message (Wartungshinweis) under the **Text** menu entry.

On the production server:

1. Check out the desired branch or tag
   - `git pull`
   - `git switch BRANCHNAME` or `git checkout v1.2.3`
2. Run `./dev/build/build-and-deploy.bash update` from the project root to build up-to-date containers locally
   - This will also trigger a database backup to the /backups folder in the container.
3. Run `docker compose up -d` to start

## Development

See [dev/DEVELOPMENT](./dev/DEVELOPMENT.md) for more information.
