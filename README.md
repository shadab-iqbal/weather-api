## Setup config.env

#### # ----- Server -----

NODE_ENV=development  
LOCAL_BACKEND_BASE_URL=http://localhost:5001/  
PORT=5001

#### # ----- DB -----

DATABASE_CONNECTION_STRING=your-mongodb-connection-string

#### # ----- Redis -----

REDIS_URL=redis://redis:6379

#### # ----- JWT -----

JWT_SECRET=your-jwt-secret  
JWT_EXPIRES_IN=1d  
JWT_COOKIE_EXPIRES_IN=1

#### # ----- Weather API -----

VISUAL_CROSSING_API_KEY=your-visual-crossing-api-key

## Run in terminal

`docker compose up -w`

## Uninstall app

`ctrl + c` to stop the container.

Then run `docker compose down --rmi all --volumes` to remove container, images, and volumes related to this project.
