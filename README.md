# fullstack_developer_capstone

Repository name: `xrwvm-fullstack_developer_capstone`

Project name: `fullstack_developer_capstone`

Cars Dealership is the application built for the IBM Full Stack Software
Developer Professional Certificate capstone. It is a national dealership
portal where visitors can browse and filter dealership branches, read customer
reviews, and create an account to post a review.

## Architecture

- React frontend for authentication, dealer listings, dealer details, and reviews
- Django application for user management, car data, and API proxy endpoints
- Node.js/Express and MongoDB service for dealership and review data
- Flask sentiment-analysis microservice
- Docker, GitHub Actions, and Kubernetes deployment configuration

## Local setup

```bash
cd server/frontend
npm install
npm run build

cd ../..
python3 -m venv .venv
source .venv/bin/activate
pip install -r server/requirements.txt
python server/manage.py migrate
python server/manage.py runserver
```

The application is available at `http://127.0.0.1:8000/`.
