import random

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import models
from django.utils import timezone

from internal_jobs.models import InternalJob
from applications.models import JobApplication
from chat.models import (
    ChatConversationState,
    ChatMessage,
    DirectConversation,
    DirectConversationState,
    DirectMessage,
    UserNotification,
)

try:
    from users.models import GraduateProfile
except Exception:
    GraduateProfile = None


DEMO_PASSWORD = "DemoPass123!"
DEMO_DOMAIN = "graduwayse.demo"


FIRST_NAMES = [
    "Aisha", "Daniel", "Maya", "James", "Sophie", "Omar", "Emily", "Noah",
    "Amelia", "Ethan", "Zara", "Lucas", "Chloe", "Adam", "Hannah", "Liam",
    "Priya", "Ben", "Grace", "Yusuf",
]

LAST_NAMES = [
    "Patel", "Smith", "Khan", "Brown", "Wilson", "Ali", "Taylor", "Johnson",
    "Davies", "Begum", "Roberts", "Thompson", "Clarke", "Ahmed", "Evans",
]

COMPANIES = [
    "BrightPath Consulting",
    "Northbridge Finance",
    "GreenTech Solutions",
    "CloudCore Digital",
    "UrbanBuild Group",
    "DataVista Analytics",
    "FutureWorks Ltd",
    "CivicSoft Technologies",
]

JOB_TITLES = [
    "Graduate Software Developer",
    "Junior Data Analyst",
    "Graduate Business Analyst",
    "Marketing Assistant",
    "Junior Project Coordinator",
    "Graduate Cyber Security Analyst",
    "Finance Graduate Trainee",
    "Junior UX Designer",
    "Graduate Cloud Engineer",
    "Junior Backend Developer",
]

LOCATIONS = [
    "London",
    "Manchester",
    "Birmingham",
    "Leeds",
    "Bristol",
    "Remote",
    "Hybrid - London",
    "Hybrid - Manchester",
]

DEGREES = [
    "Computer Science",
    "Business Management",
    "Data Science",
    "Marketing",
    "Cyber Security",
    "Software Engineering",
]

UNIVERSITIES = [
    "University of Birmingham",
    "University of Manchester",
    "University of Leeds",
    "Kingston University",
    "University of Bristol",
    "University of Nottingham",
]

SKILLS = [
    "Python, Django, REST APIs",
    "React, TypeScript, HTML, CSS",
    "SQL, Excel, data analysis",
    "Communication, teamwork, problem solving",
    "Project management and stakeholder communication",
    "Cyber security awareness, networking, Linux",
]

APPLICATION_MESSAGES = [
    "Hi, thank you for your application. We have reviewed your profile and would like to ask a few follow-up questions.",
    "Thank you for getting in touch. I am very interested in this opportunity and happy to provide more information.",
    "Could you please confirm your availability for an interview next week?",
    "Yes, I am available next week and would be happy to attend an interview.",
    "Your CV shows relevant experience for this role. Could you tell us more about your final year project?",
    "My final year project focuses on a graduate jobs platform using React, Django REST Framework and WebSockets.",
    "Thank you for the update. We will review your response and get back to you shortly.",
    "I appreciate the opportunity and look forward to hearing from you.",
]

DIRECT_MESSAGES = [
    "Hello, I found your profile interesting and wanted to discuss a potential graduate role.",
    "Thank you for contacting me. I would be happy to learn more about the opportunity.",
    "Your skills appear to match the requirements for one of our graduate positions.",
    "That sounds great. I am particularly interested in software and data-related roles.",
    "Would you be available for a short introductory conversation this week?",
    "Yes, I am available and would be happy to arrange a time.",
]


def has_field(model, field_name):
    return any(field.name == field_name for field in model._meta.get_fields())


def set_if_field(obj, field_name, value):
    if has_field(obj.__class__, field_name):
        setattr(obj, field_name, value)


def get_choice_value(model, field_name, preferred_value, fallback):
    try:
        field = model._meta.get_field(field_name)
    except Exception:
        return fallback

    if not field.choices:
        return fallback

    preferred_value = str(preferred_value).lower()

    for value, label in field.choices:
        if preferred_value in str(value).lower() or preferred_value in str(label).lower():
            return value

    return fallback


def generic_required_value(field, index):
    if field.choices:
        return list(field.choices)[0][0]

    if isinstance(field, models.CharField):
        value = f"Demo {field.name} {index}"
        return value[: field.max_length] if field.max_length else value

    if isinstance(field, models.TextField):
        return f"Demo text for {field.name} {index}."

    if isinstance(field, models.BooleanField):
        return False

    if isinstance(field, models.IntegerField):
        return 1

    if isinstance(field, models.DecimalField):
        return 1

    if isinstance(field, models.FloatField):
        return 1.0

    if isinstance(field, models.DateTimeField):
        return timezone.now()

    if isinstance(field, models.DateField):
        return timezone.now().date()

    return None


def add_missing_required_fields(model, data, index):
    for field in model._meta.get_fields():
        if not hasattr(field, "attname"):
            continue

        if field.name in data:
            continue

        if field.primary_key or field.auto_created:
            continue

        if getattr(field, "auto_now", False) or getattr(field, "auto_now_add", False):
            continue

        if field.has_default() or field.null or field.blank:
            continue

        if isinstance(field, models.ForeignKey):
            continue

        value = generic_required_value(field, index)
        if value is not None:
            data[field.name] = value

    return data


class Command(BaseCommand):
    help = "Seeds Graduwayse with demo users, jobs, applications, chats, direct messages and notifications."

    def add_arguments(self, parser):
        parser.add_argument("--graduates", type=int, default=20)
        parser.add_argument("--employers", type=int, default=6)
        parser.add_argument("--manual-jobs", type=int, default=30)
        parser.add_argument("--external-jobs", type=int, default=30)
        parser.add_argument("--applications", type=int, default=40)
        parser.add_argument("--application-messages", type=int, default=120)
        parser.add_argument("--direct-conversations", type=int, default=30)
        parser.add_argument("--direct-messages", type=int, default=120)
        parser.add_argument("--clear-demo", action="store_true")

    def handle(self, *args, **options):
        User = get_user_model()

        if options["clear_demo"]:
            self.clear_demo_users(User)

        graduates = self.create_graduates(User, options["graduates"])
        employers = self.create_employers(User, options["employers"])

        manual_jobs = self.create_internal_jobs(
            employers=employers,
            count=options["manual_jobs"],
            source=InternalJob.Source.MANUAL,
        )

        self.create_internal_jobs(
            employers=employers,
            count=options["external_jobs"],
            source=None,
        )

        applications = self.create_applications(
            graduates=graduates,
            jobs=manual_jobs,
            count=options["applications"],
        )

        self.create_application_chat_data(
            applications=applications,
            count=options["application_messages"],
        )

        conversations = self.create_direct_conversations(
            graduates=graduates,
            employers=employers,
            count=options["direct_conversations"],
        )

        self.create_direct_messages(
            conversations=conversations,
            count=options["direct_messages"],
        )

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("Demo data created successfully."))
        self.stdout.write("")
        self.stdout.write("Example logins:")
        self.stdout.write(f"  Graduate: graduate1@{DEMO_DOMAIN}")
        self.stdout.write(f"  Employer: employer1@{DEMO_DOMAIN}")
        self.stdout.write(f"  Password: {DEMO_PASSWORD}")

    def clear_demo_users(self, User):
        self.stdout.write("Deleting old demo users...")

        if has_field(User, "email"):
            User.objects.filter(email__endswith=f"@{DEMO_DOMAIN}").delete()

        self.stdout.write(self.style.WARNING("Old demo users deleted."))

    def create_user(self, User, email, first_name, last_name, role):
        user = User.objects.filter(email=email).first()

        if not user:
            try:
                user = User.objects.create_user(
                    email=email,
                    password=DEMO_PASSWORD,
                )
            except TypeError:
                username = email.split("@")[0]
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=DEMO_PASSWORD,
                )

        user.set_password(DEMO_PASSWORD)

        set_if_field(user, "first_name", first_name)
        set_if_field(user, "last_name", last_name)
        set_if_field(user, "full_name", f"{first_name} {last_name}")
        set_if_field(user, "role", role)
        set_if_field(user, "is_active", True)
        set_if_field(user, "is_verified", True)
        set_if_field(user, "email_verified", True)
        set_if_field(user, "is_email_verified", True)

        user.save()
        return user

    def create_graduates(self, User, count):
        self.stdout.write("Creating graduates...")

        graduates = []

        for i in range(1, count + 1):
            first_name = FIRST_NAMES[(i - 1) % len(FIRST_NAMES)]
            last_name = LAST_NAMES[(i - 1) % len(LAST_NAMES)]

            graduate = self.create_user(
                User=User,
                email=f"graduate{i}@{DEMO_DOMAIN}",
                first_name=first_name,
                last_name=last_name,
                role="GRADUATE",
            )

            graduates.append(graduate)
            self.create_graduate_profile(graduate, i)

        self.stdout.write(self.style.SUCCESS(f"Created/updated {len(graduates)} graduates."))
        return graduates

    def create_employers(self, User, count):
        self.stdout.write("Creating employers...")

        employers = []

        for i in range(1, count + 1):
            company = COMPANIES[(i - 1) % len(COMPANIES)]

            employer = self.create_user(
                User=User,
                email=f"employer{i}@{DEMO_DOMAIN}",
                first_name=company.split()[0],
                last_name="Employer",
                role="EMPLOYER",
            )

            set_if_field(employer, "company_name", company)
            set_if_field(employer, "company", company)
            employer.save()

            employers.append(employer)

        self.stdout.write(self.style.SUCCESS(f"Created/updated {len(employers)} employers."))
        return employers

    def create_graduate_profile(self, graduate, index):
        if not GraduateProfile:
            return

        try:
            profile, _ = GraduateProfile.objects.get_or_create(user=graduate)
        except Exception:
            return

        set_if_field(profile, "university", random.choice(UNIVERSITIES))
        set_if_field(profile, "degree", random.choice(DEGREES))
        set_if_field(profile, "location", random.choice(LOCATIONS))
        set_if_field(profile, "skills", random.choice(SKILLS))
        set_if_field(profile, "bio", "Final year student seeking a graduate role.")
        set_if_field(profile, "graduation_year", 2026)
        set_if_field(profile, "phone", f"07123 45{index:04d}")

        profile.save()

    def create_internal_jobs(self, employers, count, source):
        if not employers:
            return []

        jobs = []

        source_label = source if source else "ADZUNA/REED"
        self.stdout.write(f"Creating {source_label} jobs...")

        for i in range(1, count + 1):
            employer = random.choice(employers)
            company = random.choice(COMPANIES)

            if source is None:
                selected_source = random.choice([
                    InternalJob.Source.ADZUNA,
                    InternalJob.Source.REED,
                ])
            else:
                selected_source = source

            job = InternalJob.objects.create(
                title=random.choice(JOB_TITLES),
                company_name=company,
                location=random.choice(LOCATIONS),
                description=(
                    f"{company} is recruiting for a graduate-level role. "
                    "The position is suitable for applicants who want to develop practical "
                    "industry experience and apply their academic knowledge in a professional environment."
                ),
                level=random.choice([
                    InternalJob.Level.GRADUATE,
                    InternalJob.Level.ENTRY,
                    InternalJob.Level.INTERNSHIP,
                ]),
                category=random.choice([
                    InternalJob.Category.SOFTWARE,
                    InternalJob.Category.DATA,
                    InternalJob.Category.CYBER,
                    InternalJob.Category.CLOUD_DEVOPS,
                    InternalJob.Category.BUSINESS,
                    InternalJob.Category.PRODUCT,
                ]),
                is_active=True,
                employer=employer,
                source=selected_source,
                external_id="" if selected_source == InternalJob.Source.MANUAL else f"demo-{selected_source.lower()}-{i}",
                external_url="" if selected_source == InternalJob.Source.MANUAL else "https://example.com/jobs/demo",
                external_created_at=None if selected_source == InternalJob.Source.MANUAL else timezone.now(),
            )

            jobs.append(job)

        self.stdout.write(self.style.SUCCESS(f"Created {len(jobs)} jobs."))
        return jobs

    def create_applications(self, graduates, jobs, count):
        if not graduates or not jobs:
            return []

        self.stdout.write("Creating job applications...")

        applications = []
        statuses = ["PENDING", "REVIEWED", "SHORTLISTED", "ACCEPTED", "REJECTED"]

        for i in range(1, count + 1):
            applicant = random.choice(graduates)
            job = random.choice(jobs)

            defaults = {}

            if has_field(JobApplication, "status"):
                defaults["status"] = get_choice_value(
                    JobApplication,
                    "status",
                    random.choice(statuses),
                    random.choice(statuses),
                )

            for field_name in ["cover_letter", "message", "personal_statement"]:
                if has_field(JobApplication, field_name):
                    defaults[field_name] = (
                        "I am interested in this role because it matches my academic "
                        "background, technical skills and graduate career goals."
                    )

            for field_name in ["feedback", "employer_feedback"]:
                if has_field(JobApplication, field_name):
                    defaults[field_name] = random.choice([
                        "",
                        "Application received and currently under review.",
                        "Strong application with relevant experience.",
                        "Candidate has been shortlisted for further review.",
                    ])

            defaults = add_missing_required_fields(JobApplication, defaults, i)

            try:
                application, _ = JobApplication.objects.get_or_create(
                    applicant=applicant,
                    job=job,
                    defaults=defaults,
                )
                applications.append(application)
            except Exception as exc:
                self.stderr.write(
                    self.style.WARNING(f"Skipped one application: {exc}")
                )

        self.stdout.write(self.style.SUCCESS(f"Created/found {len(applications)} applications."))
        return applications

    def create_application_chat_data(self, applications, count):
        if not applications:
            return

        self.stdout.write("Creating application chat messages...")

        for application in applications:
            employer = application.job.employer
            applicant = application.applicant

            if not employer or not applicant:
                continue

            ChatConversationState.objects.get_or_create(
                application=application,
                user=applicant,
            )

            ChatConversationState.objects.get_or_create(
                application=application,
                user=employer,
            )

        created = 0

        for i in range(1, count + 1):
            application = random.choice(applications)
            employer = application.job.employer
            applicant = application.applicant

            if not employer or not applicant:
                continue

            sender = applicant if i % 2 == 0 else employer
            is_applicant = sender.id == applicant.id

            message = ChatMessage.objects.create(
                application=application,
                sender=sender,
                message=random.choice(APPLICATION_MESSAGES),
                read_by_applicant=is_applicant,
                read_by_employer=not is_applicant,
            )

            if sender.id == applicant.id:
                recipient = employer
                title = "New message from applicant"
            else:
                recipient = applicant
                title = "New message from employer"

            UserNotification.objects.create(
                user=recipient,
                application=application,
                title=title,
                message=message.message[:200],
            )

            created += 1

        self.stdout.write(self.style.SUCCESS(f"Created {created} application chat messages."))

    def create_direct_conversations(self, graduates, employers, count):
        if not graduates or not employers:
            return []

        self.stdout.write("Creating direct conversations...")

        conversations = []

        for i in range(1, count + 1):
            graduate = random.choice(graduates)
            employer = random.choice(employers)

            conversation, _ = DirectConversation.objects.get_or_create(
                employer=employer,
                graduate=graduate,
                defaults={
                    "created_by": employer,
                },
            )

            DirectConversationState.objects.get_or_create(
                conversation=conversation,
                user=employer,
            )

            DirectConversationState.objects.get_or_create(
                conversation=conversation,
                user=graduate,
            )

            conversations.append(conversation)

        conversations = list(set(conversations))

        self.stdout.write(self.style.SUCCESS(f"Created/found {len(conversations)} direct conversations."))
        return conversations

    def create_direct_messages(self, conversations, count):
        if not conversations:
            return

        self.stdout.write("Creating direct messages...")

        created = 0

        for i in range(1, count + 1):
            conversation = random.choice(conversations)

            sender = conversation.employer if i % 2 == 0 else conversation.graduate
            is_employer = sender.id == conversation.employer_id

            message = DirectMessage.objects.create(
                conversation=conversation,
                sender=sender,
                message=random.choice(DIRECT_MESSAGES),
                read_by_employer=is_employer,
                read_by_graduate=not is_employer,
            )

            conversation.updated_at = timezone.now()
            conversation.save(update_fields=["updated_at"])

            if sender.id == conversation.employer_id:
                recipient = conversation.graduate
                title = "New direct message from employer"
            else:
                recipient = conversation.employer
                title = "New direct message from graduate"

            UserNotification.objects.create(
                user=recipient,
                application=None,
                title=title,
                message=message.message[:200],
            )

            created += 1

        self.stdout.write(self.style.SUCCESS(f"Created {created} direct messages."))
