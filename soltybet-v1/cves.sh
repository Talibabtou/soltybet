#!/bin/bash

docker scout cves localhost:5742/scraper:0.0.1 > cves_report
docker scout cves localhost:5742/oracle:0.0.1 >> cves_report
docker scout cves localhost:5742/backend:0.0.1 >> cves_report
docker scout cves localhost:5742/frontend:0.0.1 >> cves_report
