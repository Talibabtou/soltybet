#!/bin/bash

# Load environment variables
set -a; . .env; set +a

# Create networks if they don't exist
docker network create --driver overlay solty || true
docker network create --driver overlay oracle || true

# Build and push backend
cd backend
docker build -t localhost:5742/backend:0.0.1 .
docker push localhost:5742/backend:0.0.1
cd ..

# Build and push scraper
cd scraper
docker build -t localhost:5742/scraper:0.0.1 .
docker push localhost:5742/scraper:0.0.1
cd ..

# Build and push oracle
cd oracle
docker build -t localhost:5742/oracle:0.0.1 .
docker push localhost:5742/oracle:0.0.1
cd ..

# Build and push frontend
cd frontend
docker build \
	--build-arg VITE_REACT_APP_API_PASSWORD=${VITE_REACT_APP_API_PASSWORD} \
	--build-arg VITE_REACT_APP_RPC_URL=${VITE_REACT_APP_RPC_URL} \
	--build-arg VITE_REACT_APP_ENCRYPTION_KEY=${VITE_REACT_APP_ENCRYPTION_KEY} \
	-t localhost:5742/frontend:0.0.1 .
docker push localhost:5742/frontend:0.0.1
cd ..