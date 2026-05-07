# Graduwayse

Welcome to Graduwayse. Graduwayse is a graduate job platform built with React, TypeScript, Django, Django REST Framework, and Django Channels.

Please note that Python 3.11 - 3.12 is recommended for running this project locally and other versions of python are not guaranteed to work.

## Features
- Graduate and employer accounts
- Internal and external job listings
- Applications and status tracking
- Graduate profiles and CV uploads
- Direct messaging and application chat

## Requirements
- Python 3.11 or 3.12
- Node.js and npm

## Backend setup
Open a terminal in the Backend folder and run:
bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
