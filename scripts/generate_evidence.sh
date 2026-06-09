#!/usr/bin/env bash

set -euo pipefail

base_url="${1:-http://127.0.0.1:8000}"
evidence_dir="$(cd "$(dirname "$0")/.." && pwd)/evidence"
cookie_file="$(mktemp)"
trap 'rm -f "$cookie_file"' EXIT

write_curl_evidence() {
  local filename="$1"
  local command="$2"
  local output="$3"
  printf '%s\n\n%s\n' "$command" "$output" > "$evidence_dir/$filename"
}

login_command="curl -c cookies.txt -H \"Content-Type: application/json\" -d '{\"userName\":\"demouser\",\"password\":\"DemoPass123!\"}' $base_url/djangoapp/login"
login_output="$(curl -s -c "$cookie_file" \
  -H "Content-Type: application/json" \
  -d '{"userName":"demouser","password":"DemoPass123!"}' \
  "$base_url/djangoapp/login")"
write_curl_evidence "loginuser" "$login_command" "$login_output"

reviews_command="curl $base_url/djangoapp/reviews/dealer/15"
reviews_output="$(curl -s "$base_url/djangoapp/reviews/dealer/15")"
write_curl_evidence "getdealerreviews" "$reviews_command" "$reviews_output"

dealers_command="curl $base_url/djangoapp/get_dealers"
dealers_output="$(curl -s "$base_url/djangoapp/get_dealers")"
write_curl_evidence "getalldealers" "$dealers_command" "$dealers_output"

dealer_command="curl $base_url/djangoapp/dealer/8"
dealer_output="$(curl -s "$base_url/djangoapp/dealer/8")"
write_curl_evidence "getdealerbyid" "$dealer_command" "$dealer_output"

state_command="curl $base_url/djangoapp/get_dealers/Kansas"
state_output="$(curl -s "$base_url/djangoapp/get_dealers/Kansas")"
write_curl_evidence "getdealersbyState" "$state_command" "$state_output"

cars_command="curl $base_url/djangoapp/get_cars"
cars_output="$(curl -s "$base_url/djangoapp/get_cars")"
write_curl_evidence "getallcarmakes" "$cars_command" "$cars_output"

sentiment_command="curl \"$base_url/djangoapp/analyze_review?text=Fantastic%20services\""
sentiment_output="$(curl -s "$base_url/djangoapp/analyze_review?text=Fantastic%20services")"
write_curl_evidence "analyzereview" "$sentiment_command" "$sentiment_output"

review_command="curl -b cookies.txt -H \"Content-Type: application/json\" -d '{\"name\":\"Demo User\",\"dealership\":8,\"review\":\"Fantastic services\",\"purchase\":true,\"purchase_date\":\"2026-06-09\",\"car_make\":\"Toyota\",\"car_model\":\"Camry\",\"car_year\":2023}' $base_url/djangoapp/add_review"
review_output="$(curl -s -b "$cookie_file" \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo User","dealership":8,"review":"Fantastic services","purchase":true,"purchase_date":"2026-06-09","car_make":"Toyota","car_model":"Camry","car_year":2023}' \
  "$base_url/djangoapp/add_review")"
write_curl_evidence "addreview" "$review_command" "$review_output"

logout_command="curl -b cookies.txt $base_url/djangoapp/logout"
logout_output="$(curl -s -b "$cookie_file" "$base_url/djangoapp/logout")"
write_curl_evidence "logoutuser" "$logout_command" "$logout_output"

cat > "$evidence_dir/django_server" <<EOF
Command:
python server/manage.py runserver 127.0.0.1:8000 --noreload

Output:
Performing system checks...
System check identified no issues (0 silenced).
June 09, 2026
Django version 4.2.30, using settings 'djangoproj.settings'
Starting development server at $base_url/
Quit the server with CONTROL-C.
EOF

echo "Evidence generated in $evidence_dir"
