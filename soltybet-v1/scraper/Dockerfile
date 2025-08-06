FROM python:3.12.7-alpine

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apk update && apk add --no-cache \
    gcc \
    musl-dev \
    libffi-dev \
    openssl-dev \
		--no-cache curl \
    tar

COPY requirements.in /app/

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir pip-tools \
    && pip-compile --upgrade requirements.in \
    && pip install --no-cache-dir -r requirements.txt \
    && pip uninstall -y pip pip-tools \
    && apk del gcc musl-dev libffi-dev openssl-dev

COPY . /app/

ENV DJANGO_SETTINGS_MODULE=backend.settings

RUN chmod +x /app/scrap.sh
CMD ["/bin/sh", "-c", "/app/scrap.sh"]