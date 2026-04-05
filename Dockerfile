# Фронт
FROM node:20-alpine AS frontend
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

#  Пайтон
FROM node:20-alpine AS backend
WORKDIR /app
COPY backend/ ./
EXPOSE 8080
CMD ["sh", "-c", "echo 'Backend server placeholder...' && tail -f /dev/null"]

# Джава
FROM eclipse-temurin:17-jdk-alpine AS java
WORKDIR /app
COPY java/ ./
EXPOSE 8081
CMD ["sh", "-c", "echo 'Java server placeholder...' && tail -f /dev/null"]
