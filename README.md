# 🌿 ReLoop - Campus Sustainability Trading App

> A mobile-first web app where college students trade, swap, and recycle items to earn eco-coins and reduce campus waste.

![ReLoop Home](https://img.shields.io/badge/Status-In%20Development-green) ![HTML](https://img.shields.io/badge/HTML-5-orange) ![CSS](https://img.shields.io/badge/CSS-3-blue) ![JavaScript](https://img.shields.io/badge/JavaScript-ES6-yellow)

---

## 🎬 Demo

<p align="center">
  <img src="images/demo.webp" width="300" alt="ReLoop Demo"/>
</p>

---

## 📱 Screenshots

<p align="center">
  <img src="images/screenshot-home.png" width="200" alt="Home"/>
  <img src="images/screenshot-marketplace.png" width="200" alt="Marketplace"/>
  <img src="images/screenshot-profile.png" width="200" alt="Profile"/>
</p>

---

## 🚀 Quick Start

```bash
# Clone the repo
git clone https://github.com/Ankush-Jha/unscraped.git
cd unscraped

# Serve locally (pick one)
npx serve -p 3000        # Using npx
python -m http.server 3000   # Using Python
open index.html          # Or just open in browser

# Visit
http://localhost:3000
```

---

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| **Frontend** | HTML5, CSS3 (vanilla), JavaScript ES6 |
| **Styling** | Custom CSS with CSS variables, Tailwind (wrapped.html) |
| **Icons** | Material Symbols Outlined |
| **Fonts** | Space Grotesk, Manrope, Bebas Neue |
| **Hosting** | Static files (GitHub Pages compatible) |

---

## 📁 Project Structure

```
reloop/
├── index.html          # Entry point (redirects to onboarding)
├── home.html           # Main dashboard
├── onboarding.html     # Welcome & signup flow
│
├── 📦 Marketplace
│   ├── marketplace.html    # Browse items
│   ├── item.html           # Item details template
│   ├── item-*.html         # Specific items (books, charger, etc.)
│   ├── search.html         # Search page
│   └── trade.html          # Trade confirmation
│
├── 🔍 AI Scanner
│   ├── scanning.html       # AI analysis animation
│   ├── scan1.html          # Scan results summary
│   ├── scan2.html          # Detailed upcycle ideas
│   ├── result.html         # Static result page
│   └── result-dynamic.html # Dynamic result page
│
├── 🏆 Gamification
│   ├── missions.html       # Daily missions
│   ├── achievements.html   # Badges & achievements
│   ├── leaderboard.html    # Campus rankings
│   ├── level-up.html       # Level up celebration
│   └── wrapped.html        # Eco Wrapped summary
│
├── 👤 User
│   ├── profile.html        # User profile
│   ├── settings.html       # App settings
│   ├── notifications.html  # Notifications
│   └── messages.html       # Chat list
│
├── 📖 Stories
│   ├── success-stories.html    # All stories
│   └── story-*.html            # Individual stories
│
├── 🪙 Rewards
│   ├── redeem.html         # Coin redemption
│   └── recycle.html        # Recycling info
│
├── 🎨 Assets
│   ├── css/styles.css      # Global styles
│   ├── js/app.js           # Main JavaScript
│   └── images/             # All images & screenshots
│
└── README.md
```

---

## ✨ Features

- **🔍 AI Item Scanner** - Scan items to get upcycle ideas and coin estimates
- **🛒 Marketplace** - Browse and trade items with other students
- **🪙 Eco Coins** - Earn coins for trades, redeem for campus rewards
- **🏆 Gamification** - Daily missions, achievements, campus leaderboard
- **📊 Eco Wrapped** - Your sustainability stats, Spotify-Wrapped style

---

## 👨‍💻 Built By

**Ankush Jha**  
GitHub: [@Ankush-Jha](https://github.com/Ankush-Jha)

---

## 📄 License

MIT License - feel free to fork and build upon this!
