# Ansible deployment

Playbooks in this directory update a checkout of the app, build images, start Compose, and install the backup cron jobs from the main README. They do not create the prod env files. When the offsite host vars are set, they write `env-backup.env` from those vars.

## What stays out of git

Keep these as KeePass attachments, one entry per file:

- `env-be-prod.env`
- `env-db-prod.env`
- `.env`, with `APP_DOMAIN` and, when they differ from the defaults, `TRAEFIK_NETWORK` and `TRAEFIK_ENTRYPOINT`
- the inventory (host, SSH user, port, deploy path, and the offsite backup host vars when you use that job)
- the age private identity, when using offsite backup. The server receives only the public recipient, via `backup_age_recipient` in the inventory.

Restore them when a machine is new or a secret changes. Ansible does not read KeePass.

Working copies:

- On the server, `env-be-prod.env` and `env-db-prod.env` live in the deploy checkout. Compose reads them from there. Both names are gitignored. When the offsite host vars are set, the playbook writes gitignored `env-backup.env` there as well.
- On the machine you run Ansible from, save the inventory as `deploy/ansible/inventory/local.yml`. That path is gitignored. Pass it with `-i`. An inventory outside the checkout is fine too.

`inventory/example.yml` is a fake host for reading the variable names. Do not point it at a real server.

## Requirements

On the server, for the SSH user in the inventory:

- `git`
- Docker with the `docker compose` plugin, and permission to run them
- a home directory for the SSH user (defaults use `/home/<user>/solawi-bedarf` and `/home/<user>/traefik`)
- `age` and `curl` on the default `PATH`, once the offsite host vars are set. Without those vars the playbook removes the offsite cron job.

## Run

Pass the release tag on every run. There is no default branch.

From this directory:

```bash
ansible-playbook -i inventory/local.yml site.yml -e git_ref=v1.2.3
```

Later deploys use `update`, the default. That runs `dev/backup/database-backup.bash` before building. If the database container is not there yet, the playbook falls back to `init` so the first deploy does not fail on a missing backup. You can still force that with `-e deploy_action=init`.

The playbook starts the stack with `compose.yaml` and `compose.traefik.yaml` from the checked-out `git_ref`. That ref must include `compose.traefik.yaml`. Traefik routes `APP_DOMAIN` to the frontend on the Docker network. TLS stays on HAProxy, so `compose.traefik.tls.yaml` is not included. Add that file, `TRAEFIK_ENTRYPOINT=websecure`, and `TRAEFIK_CERTRESOLVER` only when Traefik itself obtains certificates.

If the checkout does not exist yet, the playbook clones `git_repo` at that tag and then stops when the prod env files are missing. Restore those files from KeePass into the checkout and run the playbook again.

After a successful `site.yml` run, the SSH user's crontab contains:

- `0 3 * * *` `dev/backup/database-backup.bash`
- `10 3 * * *` `dev/backup/database-clean-backups.bash`

When the offsite host vars are set, the crontab also contains `20 3 * * *` `dev/backup/offsite-backup.bash`. When those vars are omitted, the playbook removes that cron job.

The offsite job packs the newest dump with the prod env files, encrypts the archive, and uploads it. Details and restore steps are in the main README. Set these host vars to have the playbook template `env-backup.env` after the checkout:

- `backup_age_recipient` — age public recipient (`age1...`)
- `backup_nextcloud_webdav_url` — `https://cloud.example/public.php/webdav`
- `backup_nextcloud_share_token` — file-drop share token

Optional: `backup_nextcloud_share_password`, `backup_offsite_extra_files`, `backup_max_dump_age_seconds`, `backup_offsite_retry_keep`. [inventory/example.yml](inventory/example.yml) lists them. Omit the three required keys and the playbook removes the offsite cron job. `env-backup.env` is not one of `required_env_files`.

`site.yml` does not start Traefik. Traefik is a separate install under the SSH user's home, defaulting to `/home/<user>/traefik`. The playbook copies [../traefik/compose.yaml](../traefik/compose.yaml) there and starts it. The app checkout is not required, and no sudo is needed.

```bash
ansible-playbook -i inventory/local.yml deploy-traefik.yml
```

That creates the Docker network `compose.traefik.yaml` joins and publishes the HTTP entrypoint `web`. Optional `TRAEFIK_NETWORK`, `TRAEFIK_WEB_PORT`, and `TRAEFIK_DEBUG` go in `/home/<user>/traefik/.env` on the server, not in the app `.env`. Set `TRAEFIK_WEB_PORT` when port 80 is already in use. Set `TRAEFIK_DEBUG=true` to log each request to `docker compose logs -f`. Use the same `TRAEFIK_NETWORK` in the app `.env` when it is not `traefik`.
