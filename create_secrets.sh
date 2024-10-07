#!/bin/bash
# Function to generate a random 50-character password
generate_password() {
    tr -dc 'A-Za-z0-9!@#$%^&*()_+{}|:<>?=' < /dev/urandom | head -c 50
}

# Array of secret names
secrets=("db_pass" "pgadmin_pass" "graf_pass" "django_pass" "front_pass" "scraper_pass" "stats_pass")

# Create secrets
for secret in "${secrets[@]}"; do
    password=$(generate_password)
    echo "$password" | docker secret create "$secret" -
    echo "Created secret: $password - $secret"
done

echo "All secrets created successfully!"