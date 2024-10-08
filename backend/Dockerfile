FROM python:3.12.7-alpine

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.in /app/
COPY ./tools/entrypoint.sh /entrypoint.sh
COPY ./app /app

RUN mkdir -p /app/logs && chmod 777 /app/logs

RUN chmod +x /entrypoint.sh

RUN apk update && apk add --no-cache \
    gcc \
    musl-dev \
    postgresql-dev \
    postgresql-client

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir pip-tools \
    && pip-compile --upgrade requirements.in \
    && pip install --no-cache-dir -r requirements.txt \
    && pip uninstall -y pip pip-tools \
    && apk del gcc musl-dev

ENTRYPOINT ["sh", "/entrypoint.sh"]