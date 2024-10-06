#!/bin/bash

#######
#
# This script is used to setup the django application.
#
#######

function generate_password ()
{
    # Equivalent to a return
    echo `tr -dc 'A-Za-z0-9!"#$%&'\''()*+,-./:;<=>?@[\]^_\`{|}~' </dev/urandom | head -c $1`
}
# Read the Docker secret
function read_secret() {
    local secret_name="$1"
    local secret_path="/run/secrets/${secret_name}"
    
    if [ -f "$secret_path" ]; then
        cat "$secret_path" | tr -d '\n'
    else
        return 1
    fi
}

# Check if the database is ready
echo -e "\n========== Checking database readiness ==========\n"
until pg_isready -h db -p 5432 -U solty -d soltybet_production; do
    echo "Waiting for database to be ready..."
    sleep 2
done

# Migrate everything to the database
echo -e "\n========== Migrating database ==========\n"

python manage.py makemigrations
python manage.py migrate


# Create a superuser with a random password
echo -e "\n========== Creating superuser ==========\n"

DJANGO_SUPERUSER_EMAIL="${DJANGO_SUPERUSER_EMAIL:-test@test.com}"
DJANGO_SUPERUSER_USERNAME="${DJANGO_SUPERUSER_USERNAME:-solty}"
DJANGO_SUPERUSER_PASSWORD=$(read_secret "django_pass")
FRONT_PASSWORD=$(read_secret "front_pass")
SCRAPER_PASSWORD=$(read_secret "scraper_pass")

echo $FRONT_PASSWORD

# Delete the user to make sure we can create a new one
python manage.py shell -c 'from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.filter(username="admin").delete()'
python manage.py shell -c 'from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.filter(username="solty").delete()'
# Create the superuser with the password from the secret
echo "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.create_superuser('$DJANGO_SUPERUSER_USERNAME', '$DJANGO_SUPERUSER_EMAIL', '$DJANGO_SUPERUSER_PASSWORD')" | python manage.py shell

if [ $? -ne 0 ]; then
	echo -e "\033[0;31mAn error occurred while creating user \"$DJANGO_SUPERUSER_USERNAME\":\033[0m $ERROR"
	exit 1
else
	echo -e "\033[0;32mUser \"$DJANGO_SUPERUSER_USERNAME\" successfully created.\033[0m"
fi

python manage.py shell -c 'from django.contrib.auth import get_user_model; model = get_user_model(); model.objects.filter(username="scrap").delete()'
python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.create_user(username='scrap', password='$SCRAPER_PASSWORD')"

python manage.py shell -c 'from django.contrib.auth import get_user_model; model = get_user_model(); model.objects.filter(username="grafana").delete()'
python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.create_user(username='grafana', password='$GRAFANA_PASSWORD')"

python manage.py shell -c 'from django.contrib.auth import get_user_model; model = get_user_model(); model.objects.filter(username="front").delete()'
python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.create_user(username='front', password='$FRONT_PASSWORD')"

# Checking the environment
# To be safe run in prod by default
STAGE="${STAGE:-prod}"
PORT="${PORT:-8000}"

echo -e "\n==========  Starting server in ${STAGE} mode  ==========\n"

if [ "$STAGE" = "dev" ]; then

	export DEBUG="True"

	# Launch the development server
	python manage.py runserver 0.0.0.0:$PORT

else

	export DEBUG="False"

	python manage.py collectstatic --noinput

	# Launch the production server
	daphne -b 0.0.0.0 -p 8000 backend.asgi:application
	
fi