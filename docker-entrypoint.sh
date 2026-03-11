#!/bin/sh
set -e

# Generate __ENV.js with runtime environment variables
cat > /app/public/__ENV.js << EOF
window.__ENV = {
  API_URL: "${API_URL:-http://localhost:8000}"
};
EOF

# Start the application
exec npm start
