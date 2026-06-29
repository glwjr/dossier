"""Substantial seed for local development.

Scenario: a computational linguistics PhD applicant, Fall 2026 cycle.
Deadlines have passed; results are mostly in. Covers every entity type.

Run on a fresh database or after resetting:
    alembic downgrade base && alembic upgrade head && python seed.py
"""

from datetime import date

from sqlalchemy import select

from app.config import settings
from app.db import SessionLocal, engine
from app.models.base import Base
from app.models.deadline import Deadline, DeadlineKind
from app.models.document import Document, DocumentKind, DocumentStatus
from app.models.outreach import OutreachContact, OutreachResponse
from app.models.program import Program, ProgramStatus, Tier
from app.models.recommender import (
    ProgramRecommender,
    Recommender,
    RecommenderStatus,
)
from app.models.requirement import Requirement, RequirementKind, RequirementStatus
from app.models.user import User

# ---------------------------------------------------------------------------
# Programs
# ---------------------------------------------------------------------------

_PROGRAMS = [
    {
        "school": "MIT",
        "department": "Electrical Engineering & Computer Science",
        "degree": "PhD",
        "url": "https://www.eecs.mit.edu/academics/graduate-programs/",
        "tier": Tier.reach,
        "status": ProgramStatus.rejected,
        "app_fee": 90,
        "notes": "Applied to CSAIL NLP group. No interview offered.",
    },
    {
        "school": "Stanford University",
        "department": "Computer Science",
        "degree": "PhD",
        "url": "https://cs.stanford.edu/academics/phd",
        "tier": Tier.reach,
        "status": ProgramStatus.rejected,
        "app_fee": 125,
        "notes": "Targeted NLP group. Very competitive cycle.",
    },
    {
        "school": "Carnegie Mellon University",
        "department": "Language Technologies Institute",
        "degree": "PhD",
        "url": "https://www.lti.cs.cmu.edu/academics/phd",
        "tier": Tier.reach,
        "status": ProgramStatus.interview,
        "app_fee": 75,
        "notes": (
            "Interview scheduled for Feb 14. Flew out for visit day."
            " Very strong fit with Prof. Xu's group."
        ),
    },
    {
        "school": "UC Berkeley",
        "department": "Linguistics",
        "degree": "PhD",
        "url": "https://lx.berkeley.edu/graduate",
        "tier": Tier.reach,
        "status": ProgramStatus.waitlisted,
        "app_fee": 140,
        "notes": (
            "Waitlisted Mar 1. Sent a letter of continued interest."
            " Position 3 on waitlist."
        ),
    },
    {
        "school": "University of Washington",
        "department": "Computer Science & Engineering",
        "degree": "PhD",
        "url": "https://www.cs.washington.edu/academics/phd",
        "tier": Tier.match,
        "status": ProgramStatus.accepted,
        "app_fee": 85,
        "stipend": 37000,
        "decision_deadline": date(2026, 4, 15),
        "notes": (
            "Accepted with full funding + TAship. Visit day was excellent."
            " Top choice if CMU doesn't pan out."
        ),
    },
    {
        "school": "Johns Hopkins University",
        "department": "Computer Science",
        "degree": "PhD",
        "url": "https://www.cs.jhu.edu/graduate-studies/phd/",
        "tier": Tier.match,
        "status": ProgramStatus.accepted,
        "app_fee": 75,
        "stipend": 38000,
        "decision_deadline": date(2026, 4, 1),
        "notes": "Accepted with NSF fellowship supplement. CLSP is a great group.",
    },
    {
        "school": "UT Austin",
        "department": "Linguistics",
        "degree": "PhD",
        "url": "https://liberalarts.utexas.edu/linguistics/graduate/phd.php",
        "tier": Tier.match,
        "status": ProgramStatus.accepted,
        "app_fee": 65,
        "stipend": 22000,
        "decision_deadline": date(2026, 4, 15),
        "notes": "Accepted. Strong computational track. Stipend lower than UW.",
    },
    {
        "school": "University of Illinois Urbana-Champaign",
        "department": "Computer Science",
        "degree": "PhD",
        "url": "https://cs.illinois.edu/academics/graduate/phd-program",
        "tier": Tier.likely,
        "status": ProgramStatus.accepted,
        "app_fee": 70,
        "stipend": 30000,
        "decision_deadline": date(2026, 4, 15),
        "notes": "Accepted. NLP group is solid. Backup option.",
    },
    {
        "school": "Ohio State University",
        "department": "Linguistics",
        "degree": "PhD",
        "url": "https://linguistics.osu.edu/grad",
        "tier": Tier.likely,
        "status": ProgramStatus.submitted,
        "app_fee": 60,
        "notes": "Submitted Dec 15. Haven't heard back yet.",
    },
    {
        "school": "Georgetown University",
        "department": "Linguistics",
        "degree": "PhD",
        "url": "https://linguistics.georgetown.edu/graduate/",
        "tier": Tier.likely,
        "status": ProgramStatus.researching,
        "app_fee": None,
        "notes": (
            "Considering for next cycle if this one doesn't work out."
            " Strong computational semantics program."
        ),
    },
]

# ---------------------------------------------------------------------------
# Recommenders
# ---------------------------------------------------------------------------

_RECOMMENDERS = [
    {
        "name": "Prof. Margaret Chen",
        "institution": "UC San Diego",
        "email": "m.chen@ucsd.edu",
        "notes": (
            "Primary advisor. Specializes in computational syntax."
            " Know her well — three years in her lab."
        ),
    },
    {
        "name": "Prof. David Osei",
        "institution": "Stanford University",
        "email": "osei@cs.stanford.edu",
        "notes": (
            "Collaborator on the summer NLP internship project. Strong letter expected."
        ),
    },
    {
        "name": "Dr. Sarah Novak",
        "institution": "Google DeepMind",
        "email": "snovak@deepmind.com",
        "notes": (
            "Industry mentor from 2024 internship. Reached out Dec 1 — she agreed."
        ),
    },
]

# Per-program recommender assignments: (rec_index, status, due_date, notes)
_ASSIGNMENTS: dict[
    int, list[tuple[int, RecommenderStatus, date | None, str | None]]
] = {
    0: [  # MIT
        (0, RecommenderStatus.submitted, date(2025, 12, 1), None),
        (1, RecommenderStatus.submitted, date(2025, 12, 1), None),
        (
            2,
            RecommenderStatus.submitted,
            date(2025, 12, 1),
            "Requested Nov 20, submitted on time.",
        ),
    ],
    1: [  # Stanford
        (0, RecommenderStatus.submitted, date(2025, 12, 1), None),
        (1, RecommenderStatus.submitted, date(2025, 12, 1), None),
        (2, RecommenderStatus.submitted, date(2025, 12, 1), None),
    ],
    2: [  # CMU
        (0, RecommenderStatus.submitted, date(2025, 12, 15), None),
        (1, RecommenderStatus.submitted, date(2025, 12, 15), None),
        (2, RecommenderStatus.submitted, date(2025, 12, 15), None),
    ],
    3: [  # Berkeley
        (0, RecommenderStatus.submitted, date(2026, 1, 5), None),
        (1, RecommenderStatus.submitted, date(2026, 1, 5), None),
        (2, RecommenderStatus.submitted, date(2026, 1, 5), None),
    ],
    4: [  # UW
        (0, RecommenderStatus.submitted, date(2025, 12, 15), None),
        (1, RecommenderStatus.submitted, date(2025, 12, 15), None),
        (2, RecommenderStatus.submitted, date(2025, 12, 15), None),
    ],
    5: [  # JHU
        (0, RecommenderStatus.submitted, date(2025, 12, 15), None),
        (1, RecommenderStatus.submitted, date(2025, 12, 15), None),
        (
            2,
            RecommenderStatus.confirmed,
            date(2025, 12, 15),
            "Submitted day-of per portal.",
        ),
    ],
    6: [  # UT Austin
        (0, RecommenderStatus.submitted, date(2026, 1, 1), None),
        (1, RecommenderStatus.submitted, date(2026, 1, 1), None),
        (2, RecommenderStatus.submitted, date(2026, 1, 1), None),
    ],
    7: [  # UIUC
        (0, RecommenderStatus.submitted, date(2025, 12, 15), None),
        (1, RecommenderStatus.submitted, date(2025, 12, 15), None),
        (
            2,
            RecommenderStatus.asked,
            date(2025, 12, 15),
            "Portal link sent; confirmed received.",
        ),
    ],
    8: [  # Ohio State
        (0, RecommenderStatus.submitted, date(2025, 12, 15), None),
        (1, RecommenderStatus.confirmed, date(2025, 12, 15), None),
        (2, RecommenderStatus.asked, date(2025, 12, 15), None),
    ],
    9: [],  # Georgetown — researching, no assignments yet
}

# ---------------------------------------------------------------------------
# Requirements
# ---------------------------------------------------------------------------


def _requirements(program_index: int, program_status: ProgramStatus) -> list[dict]:
    done = RequirementStatus.done
    todo = RequirementStatus.todo
    ip = RequirementStatus.in_progress
    waived = RequirementStatus.waived

    is_submitted = program_status not in (
        ProgramStatus.researching,
        ProgramStatus.drafting,
    )
    s = done if is_submitted else ip

    base = [
        {"label": "Statement of Purpose", "kind": RequirementKind.sop, "status": s},
        {"label": "CV / Resume", "kind": RequirementKind.cv, "status": done},
        {"label": "Transcripts", "kind": RequirementKind.transcript, "status": s},
        {"label": "Application fee", "kind": RequirementKind.fee, "status": s},
    ]

    extras: dict[int, list[dict]] = {
        0: [  # MIT
            {
                "label": "Writing sample (research paper)",
                "kind": RequirementKind.writing_sample,
                "status": done,
            },
            {
                "label": "GRE General (waived)",
                "kind": RequirementKind.gre,
                "status": waived,
                "notes": "Waived for 2026 cycle.",
            },
            {
                "label": "3 letters of recommendation",
                "kind": RequirementKind.other,
                "status": done,
            },
        ],
        1: [  # Stanford
            {
                "label": "Research statement",
                "kind": RequirementKind.other,
                "status": done,
            },
            {
                "label": "GRE (not required)",
                "kind": RequirementKind.gre,
                "status": waived,
            },
            {
                "label": "3 letters of recommendation",
                "kind": RequirementKind.other,
                "status": done,
            },
        ],
        2: [  # CMU LTI
            {
                "label": "Writing sample",
                "kind": RequirementKind.writing_sample,
                "status": done,
            },
            {
                "label": "GRE (optional)",
                "kind": RequirementKind.gre,
                "status": waived,
                "notes": "Chose not to submit.",
            },
            {
                "label": "3 letters of recommendation",
                "kind": RequirementKind.other,
                "status": done,
            },
            {
                "label": "Video introduction (optional)",
                "kind": RequirementKind.other,
                "status": done,
                "notes": "Recorded 2-min intro for the portal.",
            },
        ],
        3: [  # Berkeley Linguistics
            {
                "label": "Writing sample (15–20 pages)",
                "kind": RequirementKind.writing_sample,
                "status": done,
                "notes": "Submitted senior thesis excerpt.",
            },
            {
                "label": "GRE Subject — Linguistics",
                "kind": RequirementKind.gre,
                "status": waived,
                "notes": "Waived.",
            },
            {
                "label": "3 letters of recommendation",
                "kind": RequirementKind.other,
                "status": done,
            },
        ],
        4: [  # UW CSE
            {
                "label": "Writing sample (research paper)",
                "kind": RequirementKind.writing_sample,
                "status": done,
            },
            {
                "label": "GRE (not required)",
                "kind": RequirementKind.gre,
                "status": waived,
            },
            {
                "label": "3 letters of recommendation",
                "kind": RequirementKind.other,
                "status": done,
            },
        ],
        5: [  # JHU
            {
                "label": "Writing sample",
                "kind": RequirementKind.writing_sample,
                "status": done,
            },
            {
                "label": "GRE (waived)",
                "kind": RequirementKind.gre,
                "status": waived,
            },
            {
                "label": "3 letters of recommendation",
                "kind": RequirementKind.other,
                "status": done,
            },
        ],
        6: [  # UT Austin Linguistics
            {
                "label": "Writing sample (20 pages max)",
                "kind": RequirementKind.writing_sample,
                "status": done,
            },
            {
                "label": "GRE General",
                "kind": RequirementKind.gre,
                "status": done,
                "notes": "Submitted 168V / 167Q.",
            },
            {
                "label": "3 letters of recommendation",
                "kind": RequirementKind.other,
                "status": done,
            },
        ],
        7: [  # UIUC CS
            {
                "label": "Writing sample",
                "kind": RequirementKind.writing_sample,
                "status": done,
            },
            {
                "label": "GRE (optional — not submitted)",
                "kind": RequirementKind.gre,
                "status": waived,
            },
            {
                "label": "3 letters of recommendation",
                "kind": RequirementKind.other,
                "status": done,
            },
        ],
        8: [  # Ohio State
            {
                "label": "Writing sample",
                "kind": RequirementKind.writing_sample,
                "status": done,
            },
            {
                "label": "GRE (optional)",
                "kind": RequirementKind.gre,
                "status": waived,
            },
            {
                "label": "3 letters of recommendation",
                "kind": RequirementKind.other,
                "status": s,
            },
        ],
        9: [  # Georgetown — early research
            {
                "label": "Writing sample",
                "kind": RequirementKind.writing_sample,
                "status": todo,
            },
            {
                "label": "GRE requirements TBD",
                "kind": RequirementKind.gre,
                "status": todo,
            },
            {
                "label": "3 letters of recommendation",
                "kind": RequirementKind.other,
                "status": todo,
            },
        ],
    }

    return base + extras.get(program_index, [])


# ---------------------------------------------------------------------------
# Deadlines
# ---------------------------------------------------------------------------

_DEADLINES: dict[int, list[dict]] = {
    0: [  # MIT
        {
            "kind": DeadlineKind.application,
            "due_date": date(2025, 12, 1),
            "done": True,
        },
        {
            "kind": DeadlineKind.fee_waiver,
            "due_date": date(2025, 11, 15),
            "done": True,
            "notes": "Requested via email — approved.",
        },
    ],
    1: [  # Stanford
        {
            "kind": DeadlineKind.application,
            "due_date": date(2025, 12, 1),
            "done": True,
        },
        {
            "kind": DeadlineKind.fellowship,
            "due_date": date(2025, 11, 15),
            "done": True,
            "notes": "Knight-Hennessy Scholars — did not advance.",
        },
    ],
    2: [  # CMU
        {
            "kind": DeadlineKind.application,
            "due_date": date(2025, 12, 15),
            "done": True,
        },
        {
            "kind": DeadlineKind.fellowship,
            "due_date": date(2025, 12, 1),
            "done": True,
            "notes": "Presidential Fellowship nomination submitted.",
        },
    ],
    3: [  # Berkeley
        {
            "kind": DeadlineKind.application,
            "due_date": date(2026, 1, 5),
            "done": True,
        },
        {
            "kind": DeadlineKind.fee_waiver,
            "due_date": date(2025, 12, 1),
            "done": True,
        },
    ],
    4: [  # UW
        {
            "kind": DeadlineKind.application,
            "due_date": date(2025, 12, 15),
            "done": True,
        },
        {
            "kind": DeadlineKind.fellowship,
            "due_date": date(2025, 12, 1),
            "done": True,
            "notes": "Applied for ARCS fellowship.",
        },
    ],
    5: [  # JHU
        {
            "kind": DeadlineKind.application,
            "due_date": date(2025, 12, 15),
            "done": True,
        },
    ],
    6: [  # UT Austin
        {
            "kind": DeadlineKind.application,
            "due_date": date(2026, 1, 1),
            "done": True,
        },
        {
            "kind": DeadlineKind.fee_waiver,
            "due_date": date(2025, 12, 1),
            "done": True,
        },
    ],
    7: [  # UIUC
        {
            "kind": DeadlineKind.application,
            "due_date": date(2025, 12, 15),
            "done": True,
        },
    ],
    8: [  # Ohio State
        {
            "kind": DeadlineKind.application,
            "due_date": date(2025, 12, 15),
            "done": True,
        },
        {
            "kind": DeadlineKind.fee_waiver,
            "due_date": date(2025, 11, 30),
            "done": True,
            "notes": "McNair scholars waiver applied.",
        },
    ],
    9: [  # Georgetown — next cycle
        {
            "kind": DeadlineKind.application,
            "due_date": date(2026, 12, 1),
            "done": False,
            "notes": "Tentative — confirm on admissions page in Sept.",
        },
    ],
}

# ---------------------------------------------------------------------------
# Outreach contacts
# ---------------------------------------------------------------------------

_OUTREACH: dict[int, list[dict]] = {
    0: [  # MIT
        {
            "name": "Prof. Regina Barzilay",
            "email": "regina@csail.mit.edu",
            "url": "https://people.csail.mit.edu/regina/",
            "contacted_on": date(2025, 10, 3),
            "response": OutreachResponse.positive,
            "notes": (
                "Replied within 48h. Encouraged applying."
                " Mentioned her clinical NLP work."
            ),
        },
        {
            "name": "Prof. Yoon Kim",
            "email": "yoonkim@mit.edu",
            "url": "https://people.csail.mit.edu/yoonkim/",
            "contacted_on": date(2025, 10, 10),
            "response": OutreachResponse.none,
            "notes": "No response after two weeks.",
        },
    ],
    1: [  # Stanford
        {
            "name": "Prof. Christopher Manning",
            "email": "manning@cs.stanford.edu",
            "url": "https://nlp.stanford.edu/~manning/",
            "contacted_on": date(2025, 10, 5),
            "response": OutreachResponse.positive,
            "notes": (
                "Encouraged applying. Noted the lab is relatively full"
                " but will review apps closely."
            ),
        },
        {
            "name": "Prof. Dan Jurafsky",
            "email": "jurafsky@stanford.edu",
            "contacted_on": date(2025, 10, 12),
            "response": OutreachResponse.none,
            "notes": "Auto-reply directing to application portal.",
        },
    ],
    2: [  # CMU
        {
            "name": "Prof. Graham Neubig",
            "email": "gneubig@cs.cmu.edu",
            "url": "http://www.phontron.com/",
            "contacted_on": date(2025, 10, 8),
            "response": OutreachResponse.meeting_scheduled,
            "notes": (
                "Zoom call Oct 22. Discussed multilingual LLM evaluation project."
                " Very positive — thinks I'm a good fit."
            ),
        },
        {
            "name": "Prof. Yulia Tsvetkov",
            "email": "ytsvetko@cs.cmu.edu",
            "contacted_on": date(2025, 10, 20),
            "response": OutreachResponse.positive,
            "notes": (
                "Brief reply — said she's taking 1-2 students"
                " and to mention our conversation in the SOP."
            ),
        },
    ],
    3: [  # Berkeley
        {
            "name": "Prof. David Bamman",
            "email": "dbamman@berkeley.edu",
            "url": "http://people.ischool.berkeley.edu/~dbamman/",
            "contacted_on": date(2025, 10, 15),
            "response": OutreachResponse.positive,
            "notes": (
                "Replied; noted the application deadline"
                " and said he reviews all materials carefully."
            ),
        },
    ],
    4: [  # UW
        {
            "name": "Prof. Noah Smith",
            "email": "nasmith@cs.washington.edu",
            "url": "https://nasmith.github.io/",
            "contacted_on": date(2025, 10, 7),
            "response": OutreachResponse.positive,
            "notes": (
                "Responded quickly. Interested in my work on low-resource parsing."
                " Suggested connecting with his postdoc."
            ),
        },
        {
            "name": "Prof. Luke Zettlemoyer",
            "email": "lsz@cs.washington.edu",
            "contacted_on": date(2025, 10, 20),
            "response": OutreachResponse.none,
            "notes": "No response.",
        },
    ],
    5: [  # JHU
        {
            "name": "Prof. Benjamin Van Durme",
            "email": "vandurme@cs.jhu.edu",
            "url": "https://www.cs.jhu.edu/~vandurme/",
            "contacted_on": date(2025, 10, 18),
            "response": OutreachResponse.positive,
            "notes": "Enthusiastic reply. CLSP community seems very collaborative.",
        },
    ],
    8: [  # Ohio State
        {
            "name": "Prof. Micha Elsner",
            "email": "elsner@ling.osu.edu",
            "contacted_on": date(2025, 11, 1),
            "response": OutreachResponse.positive,
            "notes": "Brief but encouraging reply.",
        },
    ],
    9: [  # Georgetown
        {
            "name": "Prof. Nathan Schneider",
            "email": "nathan.schneider@georgetown.edu",
            "url": "https://people.cs.georgetown.edu/nschneid/",
            "contacted_on": date(2026, 3, 15),
            "response": OutreachResponse.meeting_scheduled,
            "notes": (
                "Zoom call April 2. Interested in Universal Dependencies work."
                " Considering applying next cycle."
            ),
        },
    ],
}

# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------


def _documents(program_index: int, program_status: ProgramStatus) -> list[dict]:
    is_submitted = program_status not in (
        ProgramStatus.researching,
        ProgramStatus.drafting,
    )
    sop_status = DocumentStatus.final if is_submitted else DocumentStatus.in_progress

    docs: list[dict] = [
        {
            "kind": DocumentKind.sop,
            "title": f"Statement of Purpose — {_PROGRAMS[program_index]['school']}",
            "status": sop_status,
            "url": (
                "https://docs.google.com/document/d/sop-placeholder"
                if is_submitted
                else None
            ),
            "notes": (
                "Tailored from base SOP. Emphasized program-specific faculty and fit."
                if is_submitted
                else "Draft in progress."
            ),
        },
    ]

    # Shared documents attached to the first program to avoid redundancy
    if program_index == 0:
        docs += [
            {
                "kind": DocumentKind.cv,
                "title": "Academic CV",
                "status": DocumentStatus.final,
                "url": "https://docs.google.com/document/d/cv-placeholder",
                "notes": "Updated Nov 2025. 2 pages.",
            },
            {
                "kind": DocumentKind.writing_sample,
                "title": ("Low-Resource Dependency Parsing in Endangered Languages"),
                "status": DocumentStatus.final,
                "url": "https://docs.google.com/document/d/ws-placeholder",
                "notes": (
                    "Adapted from senior thesis. 18 pages."
                    " Used across all applications."
                ),
            },
        ]

    if program_index == 2:  # CMU — video intro
        docs.append(
            {
                "kind": DocumentKind.other,
                "title": "Video Introduction (CMU LTI portal)",
                "status": DocumentStatus.final,
                "notes": "2 min recording. Uploaded directly to LTI portal.",
            }
        )

    if program_index == 9:  # Georgetown — separate personal statement required
        docs.append(
            {
                "kind": DocumentKind.personal_statement,
                "title": "Personal Statement draft (Georgetown)",
                "status": DocumentStatus.draft,
                "notes": (
                    "Georgetown asks for a separate personal statement"
                    " in addition to the SOP."
                ),
            }
        )

    return docs


# ---------------------------------------------------------------------------
# Seed
# ---------------------------------------------------------------------------

# Application deadline per program index (used for requirement due dates)
_APP_DEADLINE: dict[int, date] = {
    0: date(2025, 12, 1),
    1: date(2025, 12, 1),
    2: date(2025, 12, 15),
    3: date(2026, 1, 5),
    4: date(2025, 12, 15),
    5: date(2025, 12, 15),
    6: date(2026, 1, 1),
    7: date(2025, 12, 15),
    8: date(2025, 12, 15),
    9: date(2026, 12, 1),
}


def seed() -> None:
    Base.metadata.create_all(engine)

    with SessionLocal() as db:
        # Dev user
        user = db.scalar(select(User).where(User.email == settings.dev_user_email))
        if user is None:
            user = User(email=settings.dev_user_email, name="Dev User")
            db.add(user)
            db.flush()
            print(f"Created dev user: {settings.dev_user_email}")
        else:
            print(f"Dev user already exists: {settings.dev_user_email}")

        existing = db.scalars(select(Program).where(Program.user_id == user.id)).all()
        if existing:
            print(f"User already has {len(existing)} program(s) — skipping seed.")
            print(
                "To reseed: alembic downgrade base"
                " && alembic upgrade head && python seed.py"
            )
            return

        # Recommenders
        recommenders: list[Recommender] = []
        for rec_data in _RECOMMENDERS:
            rec = Recommender(**rec_data, user_id=user.id)
            db.add(rec)
            recommenders.append(rec)
        db.flush()
        print(f"Created {len(recommenders)} recommender(s).")

        total_reqs = total_deadlines = total_outreach = 0
        total_docs = total_assignments = 0

        for i, prog_data in enumerate(_PROGRAMS):
            prog = Program(**prog_data, user_id=user.id)
            db.add(prog)
            db.flush()

            for req_data in _requirements(i, prog.status):
                notes = req_data.pop("notes", None)
                # CV has no deadline; all others share the application deadline
                due = (
                    None
                    if req_data["kind"] == RequirementKind.cv
                    else _APP_DEADLINE.get(i)
                )
                db.add(
                    Requirement(
                        **req_data, program_id=prog.id, due_date=due, notes=notes
                    )
                )
                total_reqs += 1

            for dl_data in _DEADLINES.get(i, []):
                db.add(Deadline(**dl_data, program_id=prog.id))
                total_deadlines += 1

            for rec_idx, status, due_date, notes in _ASSIGNMENTS.get(i, []):
                db.add(
                    ProgramRecommender(
                        program_id=prog.id,
                        recommender_id=recommenders[rec_idx].id,
                        status=status,
                        due_date=due_date,
                        notes=notes,
                    )
                )
                total_assignments += 1

            for contact_data in _OUTREACH.get(i, []):
                db.add(OutreachContact(**contact_data, program_id=prog.id))
                total_outreach += 1

            for doc_data in _documents(i, prog.status):
                db.add(Document(**doc_data, program_id=prog.id))
                total_docs += 1

        db.commit()

        print(f"Seeded {len(_PROGRAMS)} programs.")
        print(f"  {total_reqs} requirements")
        print(f"  {total_deadlines} deadlines")
        print(f"  {total_assignments} recommender assignments")
        print(f"  {total_outreach} outreach contacts")
        print(f"  {total_docs} documents")


if __name__ == "__main__":
    seed()
