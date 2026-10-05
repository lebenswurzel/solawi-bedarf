# Ansible deployment

Playbooks in this directory update a checkout of the app, build images, start Compose, and install the backup cron jobs from the main README. They do not create the prod env files. They write `.env` from `app_domain`. When the offsite host vars are set, they write `env-backup.env` from those vars.

## What stays out of git

Keep these as KeePass attachments, one entry per file:

- `env-be-prod.env`
- `env-db-prod.env`
- the inventory (host, SSH user, port, `app_domain`, `git_ref`, deploy path, `instance_name` when this is a second checkout, and the offsite backup host vars when you use that job)
- the age private identity, when using offsite backup. The server receives only the public recipient, via `backup_age_recipient` in the inventory.

Restore them when a machine is new or a secret changes. Ansible does not read KeePass.

Working copies:

- On the server, `env-be-prod.env` and `env-db-prod.env` live in the deploy checkout. Compose reads them from there. Both names are gitignored. The playbook writes gitignored `.env` there from `app_domain`. When the offsite host vars are set, it also writes gitignored `env-backup.env`.
- On the machine you run Ansible from, save the inventory as `deploy/ansible/inventory/local.yml`. That path is gitignored. Pass it with `-i`. An inventory outside the checkout is fine too.

`inventory/example.yml` is a fake host for reading the variable names. Do not point it at a real server.

## Requirements

On the server, for the SSH user in the inventory:

- `git`
- Docker with the `docker compose` plugin, and permission to run them
- a home directory for the SSH user (the app defaults to `/home/<user>/solawi-bedarf`, or `/home/<user>/<instance_name>` when `instance_name` is set; Traefik defaults to `/home/<user>/traefik`)
- `age` and `curl` on the default `PATH`, once the offsite host vars are set. Without those vars the playbook removes the offsite cron job.

## Run

Set `git_ref` on the host in the inventory to the release tag to deploy. There is no default branch.

```yaml
bedarf.example.com:
  git_ref: v1.2.3
```

From this directory:

```bash
ansible-playbook -i inventory/local.yml site.yml
```

Later deploys use `update`, the default. That runs `dev/backup/database-backup.bash` before building. If the database container is not there yet, the playbook falls back to `init` so the first deploy does not fail on a missing backup. You can still force that with `-e deploy_action=init`.

The playbook starts the stack with `compose.yaml` and `compose.traefik.yaml` from the checked-out `git_ref`. That ref must include `compose.traefik.yaml`. After the checkout it writes `.env` with `APP_DOMAIN` set from the `app_domain` host var, replacing any `.env` already in the checkout. When `instance_name` is set it also writes `TRAEFIK_ROUTER=solawi-bedarf-<instance_name>`. Optional `database_external_port`, `backend_external_port`, `php_external_port`, and `frontend_external_port` are written as `DATABASE_EXTERNAL_PORT`, `BACKEND_EXTERNAL_PORT`, `PHP_EXTERNAL_PORT`, and `FRONTEND_EXTERNAL_PORT` when set. Traefik routes that host to the frontend on the Docker network. TLS stays on HAProxy, so `compose.traefik.tls.yaml` is not included.

Leave `instance_name` empty for the only stack on a machine. Cron comments stay `solawi-bedarf database backup`, `solawi-bedarf database backup cleanup`, and `solawi-bedarf offsite backup`. The Traefik router stays `solawi-bedarf`. Host ports stay published (`5532`, `3100`, `8180`, and `8184` unless you set the port vars).

Set `instance_name` to a token such as `bedarftest` for a second checkout. The checkout is then `/home/<user>/bedarftest` unless that host sets `deploy_path`. Cron comments become `solawi-bedarf bedarftest database backup` and the same prefix for cleanup and offsite. The router name becomes `solawi-bedarf-bedarftest` once `git_ref` contains the `TRAEFIK_ROUTER` labels in `compose.traefik.yaml`. `publish_host_ports` defaults to false, so the playbook copies [compose.no-host-ports.yaml](../../compose.no-host-ports.yaml) into the checkout and passes it to Compose. That file needs Docker Compose 2.24 or newer. Set `publish_host_ports: true` to publish host ports anyway, and set the four port vars so they do not reuse the other stack's ports.

The playbook writes `.deploy-instance` in the checkout. The file contains `unnamed` or the `instance_name`, and it is gitignored. A later run that uses a different name for that directory fails before it writes `.env`, builds, or changes cron. A checkout that already has `database/pgdata` or a `db` container and no marker is treated as `unnamed`. Point a named instance at a different `deploy_path`. When one play contains several hosts, it also fails if two hosts share a machine and the same `deploy_path`, or share a machine and the same identity.

If the checkout does not exist yet, the playbook clones `git_repo` at that tag and then stops when the prod env files are missing. Restore those files from KeePass into the checkout and run the playbook again.

After a successful `site.yml` run, the SSH user's crontab contains the database backup and cleanup jobs. With the default schedule that is minute 0 of hours `8-22/2` for the backup and `10 3` for cleanup. Ansible identifies them by the comments `solawi-bedarf database backup` and `solawi-bedarf database backup cleanup`. With `instance_name` set, those comments are `solawi-bedarf <instance_name> database backup` and `solawi-bedarf <instance_name> database backup cleanup`.

When the offsite host vars are set, the crontab also contains the offsite job at `20 3`, identified by `solawi-bedarf offsite backup` or `solawi-bedarf <instance_name> offsite backup`. When those vars are omitted, the playbook removes that cron job for this instance only.

The offsite job packs the newest dump with the prod env files, encrypts the archive, and uploads it. Details and restore steps are in the main README. Set these host vars to have the playbook template `env-backup.env` after the checkout:

- `backup_age_recipient` — age public recipient (`age1...`)
- `backup_nextcloud_webdav_url` — `https://cloud.example/public.php/webdav`
- `backup_nextcloud_share_token` — file-drop share token

Optional: `backup_nextcloud_share_password`, `backup_offsite_extra_files`, `backup_max_dump_age_seconds`, `backup_offsite_retry_keep`. [inventory/example.yml](inventory/example.yml) lists them. Omit the three required keys and the playbook removes the offsite cron job. `env-backup.env` is not one of `required_env_files`.

`site.yml` does not start Traefik. Traefik is a separate install under the SSH user's home, defaulting to `/home/<user>/traefik`. The playbook copies [../traefik/compose.yaml](../traefik/compose.yaml) there and starts it. The app checkout is not required, and no sudo is needed.

```bash
ansible-playbook -i inventory/local.yml deploy-traefik.yml
```

That creates the Docker network `compose.traefik.yaml` joins and publishes the HTTP entrypoint `web`. Optional `TRAEFIK_NETWORK`, `TRAEFIK_WEB_PORT`, and `TRAEFIK_DEBUG` go in `/home/<user>/traefik/.env` on the server. Set `TRAEFIK_WEB_PORT` when port 80 is already in use. Set `TRAEFIK_DEBUG=true` to log each request to `docker compose logs -f`. When the network name is not `traefik`, set the same value as `traefik_network` on the app host. The playbook writes it to the app `.env`. Omit `traefik_network` and `traefik_entrypoint` to keep the Compose defaults (`traefik` and `web`).

`deploy-traefik.yml` writes one key in that `.env` from the host var `traefik_trusted_ips`: `TRAEFIK_TRUSTED_IPS`. Set it to the HAProxy address, for example `192.0.2.1`, or a comma-separated list of IPs or CIDRs. Omit it and Traefik trusts only `127.0.0.1/32`, so access logs keep showing the proxy. HAProxy must send the client address (`option forwardfor`) or the logged IP does not change. The playbook leaves `TRAEFIK_WEB_PORT` and `TRAEFIK_DEBUG` as they are.
