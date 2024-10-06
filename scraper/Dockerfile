FROM python:3-alpine

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apk update && apk add --no-cache \
    gcc \
    musl-dev \
    libffi-dev \
    openssl-dev \
    firefox \
    wget \
    tar

COPY requirements.in /app/

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir pip-tools \
    && pip-compile --upgrade requirements.in \
    && pip install --no-cache-dir -r requirements.txt \
    && pip uninstall -y pip pip-tools \
    && apk del gcc musl-dev libffi-dev openssl-dev

COPY . /app/

# Install geckodriver
# RUN GECKODRIVER_VERSION=$(wget -qO- "https://api.github.com/repos/mozilla/geckodriver/releases/latest" | grep -Po '"tag_name": "\K.*?(?=")') \
#     && wget "https://github.com/mozilla/geckodriver/releases/download/${GECKODRIVER_VERSION}/geckodriver-${GECKODRIVER_VERSION}-linux64.tar.gz" \
RUN tar -xzf "geckodriver-v0.35.0-linux64.tar.gz" -C /usr/local/bin \
    && rm "geckodriver-v0.35.0-linux64.tar.gz" \
    && chmod +x /usr/local/bin/geckodriver

ENV DJANGO_SETTINGS_MODULE=backend.settings

CMD ["python", "-u", "main.py"]