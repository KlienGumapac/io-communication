# Dot Game - Multiplayer HTML5 Game

A real-time multiplayer game where players are dots on a white canvas. Features chat, collisions, and customizable avatars.

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:



**⚠️ Security Note:** The `.env` file is already in `.gitignore` to prevent leaking credentials. Never commit your `.env` file to version control!

### 3. Start the Server

**Development mode (with auto-reload):**

```bash
npm run dev
```

**Production mode:**

```bash
npm start
```

The server will run on `http://localhost:3000`

### 4. Open the Game

Navigate to `http://localhost:3000` in your browser.

## Features

- ✅ Beautiful animated login/registration page
- ✅ User registration with MongoDB
- ✅ Secure password hashing (bcrypt)
- ✅ Real-time multiplayer ready (Socket.io)
- 🚧 Login functionality (coming soon)
- 🚧 Game canvas with player movement
- 🚧 Proximity-based chat
- 🚧 Avatar customization
- 🚧 Collision detection

## Project Structure

```
htmlgame/
├── server/
│   ├── index.js          # Main server file
│   ├── models/
│   │   └── User.js       # User schema
│   └── routes/
│       └── auth.js       # Authentication routes
├── public/
│   ├── index.html        # Login page
│   ├── css/
│   │   └── style.css    # Styles
│   └── js/
│       └── auth.js      # Frontend auth logic
├── package.json
└── .env                  # Environment variables (not in git)
```

## API Endpoints

### POST `/api/auth/register`

Register a new user account.

**Request:**

```json
{
  "username": "player123",
  "password": "secretpass"
}
```

**Success Response (201):**

```json
{
  "message": "Account created successfully",
  "user": {
    "id": "...",
    "username": "player123",
    "createdAt": "..."
  }
}
```

**Error Responses:**

- `400` - Validation error
- `409` - Username already exists
- `500` - Server error

### POST `/api/auth/login`

🚧 Coming soon (not implemented yet)

## Security Features

- Passwords are hashed using bcrypt (10 salt rounds)
- MongoDB credentials stored in `.env` (not in code)
- Input validation and sanitization
- Username uniqueness enforced
- Password minimum length validation

## Tech Stack

- **Backend:** Node.js, Express, Socket.io
- **Database:** MongoDB with Mongoose
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Security:** bcryptjs for password hashing

## Development

- Server runs on port 3000 by default
- Frontend files served from `public/` directory
- MongoDB connection handled automatically on server start
- Hot reload enabled in dev mode with nodemon
