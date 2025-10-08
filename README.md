# 🎮 Emoji Matching Game

An interactive emoji matching game with explosions, stardust, and dynamic backgrounds!

## ✨ Features

### 🎯 Matching Game

- **Click/Tap** an emoji to select it (it will pulse with a glow)
- **Click/Tap** its matching pair to make them both explode and disappear
- Match all pairs to win and see victory confetti! 🎉
- Wrong match? Both emojis will shake and you'll hear a subtle error sound

### 🎨 Interactive Effects

- **Double-click anywhere** on the screen for a colorful explosion with pulsing rings
- **Right-click** (or long-press on mobile) for wild color background animations
- **Drag emojis** to reposition them manually - they're all draggable!

### 💫 Visual Magic

- Sparkling stardust lingers after every explosion (lasts 35-45 seconds)
- Pulsing explosion rings with random colors
- Screen flickers and particle effects
- Continuous shimmer on the background
- Random positioning on each page load
- Victory confetti celebration when you complete the game

### 🔊 Sound Effects

- **Select sound**: Soft click when selecting an emoji
- **Match sound**: Satisfying "pop" when you find a pair
- **Error sound**: Quick sawtooth buzz for wrong matches
- **Explosion sound**: Soft whoosh for matched pairs
- **Victory fanfare**: Triumphant celebration when you win
- **Background sound**: Ambient tone for color explosions
- **Toggle button** (🔊/🔇) in the top-right to enable/disable sounds

### 🎮 Game Controls

- **🔄 New Game**: Resets the game, brings back all emojis, and randomizes positions
- **🔊**: Toggle sound on/off (saved to browser storage)

## 🛠️ How to Add More Emoji Pairs

It's super easy! Just add pairs to `index.html`:

```html
<h1 data-match-id="star">⭐</h1>
<h1 data-match-id="star">⭐</h1>

<h1 data-match-id="alien">👽</h1>
<h1 data-match-id="alien">👽</h1>
```

**Rules:**

1. Each pair needs **two** `<h1>` tags with the **same emoji**
2. Give them the **same** `data-match-id` (can be anything unique)
3. The game automatically detects and handles all pairs - no code changes needed!

## 📱 Device Compatibility

- Works on desktop (Chrome, Safari, Firefox, Edge)
- Fully responsive on mobile and tablets
- iOS-optimized touch handling for smooth tapping
- iOS audio unlocking for sound effects
- Prevents text selection and iOS callout menus

## 🎨 Customization

All styles are in `style.css`:

- Change emoji sizes, colors, animations
- Modify explosion effects, sparkles, confetti
- Adjust background shimmer and color palettes
- Customize button styles and positioning

All game logic is in `script.js`:

- Sound synthesis using Web Audio API
- Match messages and victory messages arrays
- Animation timings and durations
- Color palettes for explosions

## 🚀 Quick Start

1. Open `index.html` in a browser
2. Click emojis to match pairs
3. Double-click for explosions
4. Drag emojis to reposition
5. Have fun! 🎉

## 💾 Technical Details

- **Pure JavaScript** - no external libraries
- **Web Audio API** - synthesized sounds (no audio files needed)
- **CSS Animations** - hardware-accelerated effects
- **LocalStorage** - saves sound preferences
- **Responsive Design** - works on any screen size

---

**Enjoy the game!** 🌟
