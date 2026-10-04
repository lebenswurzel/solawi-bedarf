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
6. If everything looks fine, run `docker compose up -d` to start
7. The website is now available at `http://localhost:8184` (or the external port you have set as `FRONTEND_EXTERNAL_PORT` in the .env file)
8. Next steps: log in as admin (username: `admin`, password: INITIAL_PASSWORD in the `env-be-prod.env` file), adjust your season configuration ("Konfiguration"), etc.

### Configuration variables

#### Backend: env-be-prod.env

Optional configuration settings that may be set as environment variables for the backend:

- `EMAIL_ENABLED=true`: Must be set in order to have emailing support. Make sure to fill out the other relevant
  `EMAIL_*` variables
- `EMAIL_SEND_REGISTER_CONFIRMATION=true`: Send an email to the user that just filled out the registration
- `EMAIL_ORDER_UPDATED_BCC=internal@solawi.biz`: Email address that receives a BCC of the order confirmation
  email whenever a user saves or updates an order

### Backups

It is advised to schedule regular database backups, e.g., using cron:

`0 3 * * * /path/to/repo/dev/backup/database-backup.bash`

This will create backups in the folder `./database/backups` which is mounted into the database container.

Also make sure to have backups of your custom .env files, especially the SECRETs.
Store `env-be-prod.env`, `env-db-prod.env`, `.env`, and the Ansible inventory as KeePass attachments.
Keep working copies only on the server and on the machine you deploy from.

For managing backup retention, a helper script can be found in `./dev/backup/cleanup_backups_script.sh`.

You may set up a crontab rule to daily execute this script in the database container:

`10 3 * * * /path/to/repo/dev/backup/database-clean-backups.bash`

To send the newest dump together with `env-be-prod.env`, `env-db-prod.env`, and `.env` to a Nextcloud file-drop share:

`20 3 * * * /path/to/repo/dev/backup/offsite-backup.bash`

With Ansible, set `backup_age_recipient`, `backup_nextcloud_webdav_url`, and `backup_nextcloud_share_token` on the host in the inventory. The playbook writes gitignored `env-backup.env` in the checkout (mode `0600`) and installs the 03:20 cron job. See [`env-backup.env.sample`](env-backup.env.sample) for the file it produces. Omit those three host vars and the playbook removes that cron job. Install `age` and `curl` on the server. Store the age private identity in KeePass and keep it off the server.

The script packs those files into `offsite/` in the checkout, encrypts the tar with `age`, deletes the plaintext tar, and uploads `https://cloud.example/public.php/webdav/<filename>` with the share token as the WebDAV username. It refuses a dump older than six hours (`MAX_DUMP_AGE_SECONDS`). Optional `OFFSITE_EXTRA_FILES` adds further paths under `extra/` in the archive, for example `/home/<user>/traefik/.env`.

A file-drop share cannot delete old uploads. Remove expired archives in the Nextcloud UI with an account that can see the folder. After a failed upload the encrypted file stays in `offsite/` and the next run retries it. That directory keeps at most seven unsent archives (`OFFSITE_RETRY_KEEP`). It is not mounted into the database container. `database/` itself is owned by root, because Docker creates it, so the offsite archive does not go there.

Restore on a machine that has the private identity:

```bash
age -d -i identity.txt -o backup.tar backup.tar.age
tar -xf backup.tar
```

Copy the env files back into the checkout, copy the `.sql.gz` into `database/backups`, and run `./dev/backup/database-restore.bash <backup_filename>`.

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
   - On a host where Traefik routes this stack, run `docker compose -f compose.yaml -f compose.traefik.yaml up -d` instead. Set `APP_DOMAIN` in `.env`.

### Traefik

`compose.traefik.yaml` attaches the frontend to an external Traefik network and sets the router host from `APP_DOMAIN` in `.env`. Traefik forwards that host to container port 8080. The frontend proxies `/api` to the backend, so the other services are not published to Traefik. A minimal Traefik instance that creates that network is in [deploy/traefik/compose.yaml](deploy/traefik/compose.yaml). The optional playbook installs that file on the server at `/home/<user>/traefik`, separate from this app's checkout.

This file expects TLS to be terminated in front of Traefik, for example by HAProxy. To let Traefik obtain certificates itself, also pass `-f compose.traefik.tls.yaml`, set `TRAEFIK_ENTRYPOINT=websecure`, and set `TRAEFIK_CERTRESOLVER`. See `.env-sample`.

### Automated deployment

Ansible playbooks in [deploy/ansible](./deploy/ansible/) check out the release tag you pass, run the build script, start Compose with `compose.traefik.yaml`, and install the backup cron jobs. They stop if `env-be-prod.env` or `env-db-prod.env` is missing. Restore those files, `.env` (including `APP_DOMAIN`), and the real inventory from KeePass as gitignored working copies. See [deploy/ansible/README.md](./deploy/ansible/README.md).

## Development

See [dev/DEVELOPMENT](./dev/DEVELOPMENT.md) for more information.
