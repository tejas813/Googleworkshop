# Stage 1: Build
FROM node:22 AS build
WORKDIR /app

# Define Build Argument for your API Key
ARG GEMINI_API_KEY
ENV GEMINI_API_KEY=$GEMINI_API_KEY

# Copy only package files first
COPY package*.json ./

# We use 'npm install' instead of 'npm ci' to allow npm 
# to fetch the correct Linux binaries for Tailwind Oxide
RUN npm install

# Copy the rest of the source code
COPY . .

# Run the build
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
# Copy your Nginx config (ensure this file exists in /nginx.conf)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build output (Vite uses 'dist')
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]