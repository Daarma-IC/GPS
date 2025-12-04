# Docker Setup Guide for GPS Fall Detection System

First Step, Make sure if your docker is running
docker ps

The second step is to run that website :
docker-compose up --build

And then See your open your chrome and open this link : http://localhost:3000
EASY RIGHT?



This guide will help you run the entire GPS fall detection system using Docker.

## Prerequisites

- Docker installed ([Download Docker](https://www.docker.com/get-started))
- Docker Compose installed (included with Docker Desktop)

## Quick Start

### 1. Build and Start All Services

```bash
# Navigate to the project root
cd c:\Users\darma\Documents\GPS

# Build and start all services
docker-compose up --build
```

This command will:
- Build the backend Docker image
- Build the frontend Docker image
- Start both services
- Set up networking between them

### 2. Access the Application

Once the services are running:

- **Frontend (Web UI)**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **WebSocket**: ws://localhost:8080

### 3. ESP32 Configuration

Update your ESP32 code to send data to:
- **HTTP Endpoint**: `http://<YOUR_HOST_IP>:3001/gps`
- **WebSocket**: `ws://<YOUR_HOST_IP>:8080`

Replace `<YOUR_HOST_IP>` with your computer's IP address on the local network.

## Docker Commands

### Start Services (in background)
```bash
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### View Logs
```bash
# All services
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# Frontend only
docker-compose logs -f frontend
```

### Rebuild After Code Changes
```bash
# Rebuild and restart
docker-compose up --build

# Rebuild specific service
docker-compose build backend
docker-compose build frontend
```

### Check Service Status
```bash
docker-compose ps
```

### Restart Services
```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
docker-compose restart frontend
```

## Advanced Configuration

### Custom Ports

Edit `docker-compose.yml` to change port mappings:

```yaml
services:
  backend:
    ports:
      - "YOUR_PORT:3001"  # Change YOUR_PORT
      
  frontend:
    ports:
      - "YOUR_PORT:80"    # Change YOUR_PORT
```

### Environment Variables

1. Copy the template:
   ```bash
   copy .env.docker .env
   ```

2. Edit `.env` with your configuration

3. Update `docker-compose.yml` to use the env file:
   ```yaml
   services:
     backend:
       env_file:
         - .env
   ```

## Troubleshooting

### Port Already in Use

If you get "port already allocated" error:

```bash
# Stop existing services
docker-compose down

# Check what's using the port (PowerShell)
netstat -ano | findstr :3001
netstat -ano | findstr :3000

# Kill the process or change ports in docker-compose.yml
```

### Services Not Communicating

1. Check if services are on the same network:
   ```bash
   docker network ls
   docker network inspect gps_gps-network
   ```

2. Check service logs:
   ```bash
   docker-compose logs backend
   docker-compose logs frontend
   ```

### Frontend Can't Connect to Backend

1. Verify backend is running:
   ```bash
   curl http://localhost:3001
   ```

2. Check nginx configuration in frontend container:
   ```bash
   docker exec -it gps-frontend cat /etc/nginx/conf.d/default.conf
   ```

### Rebuild from Scratch

Remove all containers, images, and volumes:

```bash
# Stop and remove containers
docker-compose down

# Remove images
docker rmi gps-backend gps-frontend

# Rebuild
docker-compose up --build
```

## Production Deployment

For production deployment:

1. **Update Telegram credentials** in `backend/server.js`
2. **Set up reverse proxy** (nginx/Apache) for HTTPS
3. **Configure firewall** to allow necessary ports
4. **Use Docker secrets** for sensitive data
5. **Set up monitoring** and logging
6. **Configure automatic restarts**:
   ```yaml
   restart: always
   ```

## Development Workflow

### With Docker (Recommended for Testing)
```bash
docker-compose up --build
```

### Without Docker (Development)
```bash
# Terminal 1: Backend
cd backend
npm install
node server.js

# Terminal 2: Frontend
cd frontend
npm install
npm start
```

## Docker Architecture

```
┌─────────────────────────────────────────┐
│         Docker Network: gps-network     │
│                                         │
│  ┌──────────────┐    ┌──────────────┐  │
│  │   Backend    │    │   Frontend   │  │
│  │  (Node.js)   │◄───│   (React/    │  │
│  │              │    │    nginx)    │  │
│  │  Port: 3001  │    │   Port: 80   │  │
│  │  WS: 8080    │    │              │  │
│  └──────▲───────┘    └──────────────┘  │
│         │                               │
└─────────┼───────────────────────────────┘
          │
    ┌─────┴──────┐
    │   ESP32    │
    │  (Arduino) │
    └────────────┘
```

## Notes

- The frontend is built as a production-optimized static site served by nginx
- Backend runs on Node.js with WebSocket support
- Services communicate internally via Docker network
- External access is through exposed ports
- Health checks ensure services are running properly

## Support

If you encounter issues:
1. Check the logs: `docker-compose logs -f`
2. Verify Docker is running: `docker --version`
3. Check service status: `docker-compose ps`
4. Review network configuration: `docker network inspect gps_gps-network`
