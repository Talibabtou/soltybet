docker service rm soltybet_backend
docker service rm soltybet_frontend
docker service rm soltybet_pgadmin
docker service rm soltybet_db
docker service rm soltybet_redis
docker service rm soltybet_scraper
docker service rm soltybet_grafana
docker service rm soltybet_oracle
sleep 10
docker volume rm soltybet_swarm_postgres
docker volume rm soltybet_swarm_redis
docker volume rm soltybet_swarm_grafana
docker volume rm soltybet_swarm_pgadmin