FROM node:20-bookworm-slim AS frontend

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_DEBUG=False \
    DJANGO_ALLOWED_HOSTS=*

WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . ./
COPY --from=frontend /app/frontend/build ./frontend/build

RUN python manage.py collectstatic --noinput

EXPOSE 8000
CMD ["sh", "-c", "python manage.py migrate --noinput && gunicorn djangoproj.wsgi:application --bind 0.0.0.0:8000"]
