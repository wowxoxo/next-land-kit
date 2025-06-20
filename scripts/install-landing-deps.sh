#!/bin/bash

echo "📦 Installing runtime dependencies..."

bun add \
  @iit/precision-ui \
  @iit/precision-ui-icons \
  @radix-ui/react-dialog@1.1.5 \
  @radix-ui/react-slot@1.1.1 \
  axios@1.3.5 \
  cleave.js@1.6.0 \
  csurf@1.11.0 \
  express-rate-limit@6.7.0 \
  express-slow-down@1.6.0 \
  lowdb@4.0.0 \
  next-yandex-metrica@1.0.0 \
  nodemailer@6.7.5 \
  react-parallax-tilt@1.7.277 \
  tailwindcss-aria-attributes@2.0.1 \
  uuid@11.0.5 \
  winston@3.8.2 \
  --save

echo "📚 Installing dev dependencies..."

bun add \
  @types/cleave.js@1.4.7 \
  @types/csurf@1.11.2 \
  @types/express-slow-down@1.3.2 \
  @types/nodemailer@6.4.4 \
  sass@1.77.6 \
  --dev

echo "✅ All dependencies installed successfully."
