# QuestBoard - Track Your Goals

A gamified task management application that turns your daily goals into quests with XP rewards and level progression.

## Weekly Development Update

This week I have been saving my project into GitHub and encountered several challenges that were successfully resolved:

### Challenges Faced:
- **Merge Conflicts**: Had multiple merge conflicts when merging branches
- **Browser Caching Issues**: Updated styles weren't showing in browser due to cache
- **Missing Function Errors**: ReferenceError for undefined functions
- **CSS Styling Problems**: Navbar buttons missing proper styling

### Solutions Implemented:
- Resolved all merge conflicts by keeping cleaner code implementations
- Fixed browser caching by restarting development server
- Added missing `iconForType` function for quest icons
- Created comprehensive CSS styles for navbar buttons

## How It Works

### 1. Login/Signup
- Open the application in your browser
- Create an account or login with existing credentials
- Uses Supabase authentication for secure user management

### 2. Dashboard Overview
Once logged in, you'll see:
- **User Stats**: Your current level, XP points, and coins
- **Navigation Bar**: Create Quest and Logout buttons
- **Quest List**: All your active and completed quests

### 3. Creating Quests
- Click the **"Create Quest"** button in the navbar
- Fill out the quest form:
  - **Title**: Name your quest
  - **Description**: What you need to accomplish
  - **Type**: Choose from Daily, Weekly, or One-time
  - **Difficulty**: Easy, Medium, or Hard (affects XP rewards)
- Submit to add the quest to your board

### 4. Managing Quests
- **View Quests**: See all your quests with icons indicating their type
- **Filter**: Use the dropdown to filter by quest type (All, Daily, Weekly, One-time)
- **Show Completed**: Toggle to view completed quests
- **Complete Quest**: Click the checkmark button to mark as done and earn rewards
- **Delete Quest**: Click the trash button to remove unwanted quests

### 5. Rewards System
When you complete quests, you earn:
- **XP Points**: Based on difficulty level
- **Coins**: Virtual currency for achievements
- **Level Up**: Progress through levels as you gain XP

### 6. Quest Types
- **📅 Daily**: Recurring tasks that reset each day
- **📆 Weekly**: Tasks that reset weekly
- **⭐ One-time**: Single completion tasks

## Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```

3. **Open Browser**:
   Navigate to `http://localhost:3000`

## Technologies Used

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Supabase (Database & Auth)
- **Icons**: FontAwesome
- **Server**: http-server for development

## Features

- ✅ User authentication
- ✅ Quest creation and management
- ✅ XP and leveling system
- ✅ Quest filtering and sorting
- ✅ Responsive design
- ✅ Real-time updates

---

Start your quest journey today and gamify your productivity! 🎮✨