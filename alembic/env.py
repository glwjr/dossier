import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

import app.models  # noqa: F401 — registers models in metadata for autogenerate
from alembic import context
from app.models.base import Base

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# Allow DATABASE_URL env var to override alembic.ini
# Allow DATABASE_URL env var to override alembic.ini. Inject it directly rather
# than via config.set_main_option, whose ConfigParser applies %-interpolation
# and would choke on percent-encoded characters in a Postgres URL (e.g. a
# password containing %40).
_database_url = os.environ.get("DATABASE_URL") or config.get_main_option(
    "sqlalchemy.url"
)


def run_migrations_offline() -> None:
    context.configure(
        url=_database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = _database_url
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
