"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
# Autogenerate renders SQLModel's string columns as
# `sqlmodel.sql.sqltypes.AutoString()`, but SQLModel registers no Alembic
# render hook, so it never adds its own import and the generated file dies with
# NameError on first run. Imported unconditionally here rather than remembering
# to add it by hand each time; ruff's F401 is suppressed for the runs that
# genuinely do not need it.
import sqlmodel  # noqa: F401
${imports if imports else ""}

# revision identifiers, used by Alembic.
revision: str = ${repr(up_revision)}
down_revision: Union[str, None] = ${repr(down_revision)}
branch_labels: Union[str, Sequence[str], None] = ${repr(branch_labels)}
depends_on: Union[str, Sequence[str], None] = ${repr(depends_on)}


def upgrade() -> None:
    ${upgrades if upgrades else "pass"}


def downgrade() -> None:
    ${downgrades if downgrades else "pass"}
