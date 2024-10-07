#!/bin/sh
#!/bin/sh

set -e

host="backend"
port="8000"
timeout=240

start_time=$(date +%s)

until curl -s -o /dev/null http://${host}:${port}/api/health-check/ || [ $(($(date +%s) - start_time)) -gt $timeout ]; do
  echo "Waiting for backend to be ready..."
  sleep 12
done

if [ $(($(date +%s) - start_time)) -gt $timeout ]; then
  echo "Timeout waiting for backend"
  exit 1
fi

echo "Backend is ready!"
# Run the first script in the background
python -u stats.py &

# Run the second script in the foreground
python -u main.py 