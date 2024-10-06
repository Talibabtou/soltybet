# syntax=docker/dockerfile:1.4
ARG VITE_REACT_APP_API_PASSWORD
ARG VITE_REACT_APP_RPC_URL
FROM node:20.13.1 AS build

WORKDIR /code
COPY package.json /code

RUN yarn install

COPY . .

ARG VITE_REACT_APP_API_PASSWORD
ARG REACT_APP_RPC_URL

ENV VITE_REACT_APP_API_PASSWORD=${VITE_REACT_APP_API_PASSWORD}
ENV VITE_REACT_APP_RPC_URL=${VITE_REACT_APP_RPC_URL}

# Change this line to use environment variables during build
RUN VITE_REACT_APP_API_PASSWORD=${VITE_REACT_APP_API_PASSWORD} VITE_REACT_APP_RPC_URL=${VITE_REACT_APP_RPC_URL} yarn vite build

FROM nginx:alpine
RUN apk add --no-cache curl

COPY --from=build /code/dist /usr/share/nginx/html/frontend/

COPY ./proxy/nginx-prod.conf /etc/nginx/conf.d/default.conf

# Add a script to wait for the backend
COPY wait-for-backend.sh /wait-for-backend.sh
RUN chmod +x /wait-for-backend.sh

EXPOSE 443

CMD ["/bin/sh", "-c", "/wait-for-backend.sh && nginx -g 'daemon off;'"]