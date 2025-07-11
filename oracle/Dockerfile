FROM python:3.12.7-alpine

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apk add --no-cache \
    build-base \
    openssl-dev \
    libffi-dev \
    python3-dev \
    curl \
    nodejs \
    npm \
    && npm install -g yarn \
    && rm -rf /var/cache/apk/*

COPY requirements.in /app/
COPY package.json /app/
RUN yarn install

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir pip-tools \
    && pip-compile --upgrade requirements.in \
    && pip install --no-cache-dir -r requirements.txt \
    && pip uninstall -y pip pip-tools \
    && apk del gcc libffi-dev openssl-dev build-base python3-dev

COPY . /app/

CMD ["python", "-u", "python/main.py"]