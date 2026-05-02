FROM python:3.12-slim

WORKDIR /app

# System deps (none required, but timezone helps for log readability)
RUN apt-get update && apt-get install -y --no-install-recommends \
    tzdata \
    && rm -rf /var/lib/apt/lists/*

ENV TZ=Asia/Jakarta \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

HEALTHCHECK --interval=60s --timeout=10s --start-period=60s --retries=3 \
  CMD test -f /tmp/bot_heartbeat \
   && [ $(( $(date +%s) - $(stat -c %Y /tmp/bot_heartbeat) )) -lt 180 ] \
   || exit 1

CMD ["python", "-u", "main.py"]
