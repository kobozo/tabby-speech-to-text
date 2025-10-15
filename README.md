# Tabby Speech-to-Text Plugin

A speech recognition plugin for [Tabby Terminal](https://tabby.sh) that allows you to dictate commands using your voice.

## Features

- **Keyboard-driven workflow**: No buttons, just keyboard shortcuts
- **Real-time transcription**: See text as you speak
- **Smart Enter handling**: Press Enter to stop listening and execute command
- **Visual indicator**: Know when the plugin is listening
- **Configurable**: Customize language and hotkey settings

## Installation

### Development Mode

1. Clone this repository into your Tabby plugins directory:
   ```bash
   cd ~/.tabby/plugins  # or your Tabby plugins directory
   git clone <repository-url> tabby-speech-to-text
   cd tabby-speech-to-text
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the plugin:
   ```bash
   npm run build
   ```

4. Restart Tabby

### From NPM (when published)

```bash
npm install -g tabby-speech-to-text
```

## Usage

1. **Start listening**: Press `Ctrl+Shift+S` (default hotkey) in any terminal
2. **Speak your command**: The plugin will transcribe in real-time
3. **Execute**: Press `Enter` to stop listening and run the command
4. **Cancel**: Press `Ctrl+Shift+S` again to stop without executing

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+S` | Toggle speech recognition |
| `Enter` (while listening) | Stop listening and execute command |

You can customize the toggle shortcut in Tabby's Settings → Hotkeys.

## Configuration

Access settings in Tabby's Settings panel:

- **Language**: Select your preferred speech recognition language (default: en-US)
- **Show Indicator**: Toggle the visual recording indicator
- **Hotkey**: Customize the keyboard shortcut

## Browser/Platform Support

This plugin uses the Web Speech API, which requires:
- Chromium-based browsers (Chrome, Edge, etc.)
- Electron (which Tabby uses)
- Internet connection (audio is processed by Google servers)

**Note**: Some browsers like Firefox and Brave don't support the Web Speech API due to privacy concerns.

## Privacy

The default implementation uses the Web Speech API, which sends audio to Google's servers for processing. If you have privacy concerns, please be aware of this limitation.

Future versions may include offline speech recognition options using Whisper or Vosk.

## Development

### Watch mode
```bash
npm run watch
```

### Build
```bash
npm run build
```

### Testing
The plugin can be tested by loading it in Tabby's dev mode. Make sure to restart Tabby after making changes.

## Troubleshooting

### Microphone permissions
If the plugin doesn't work, check that:
1. Your browser/Electron has microphone permissions
2. On macOS: System Preferences → Security & Privacy → Microphone
3. On Windows: Settings → Privacy → Microphone

### Plugin not loading
1. Check that `package.json` contains `"tabby-plugin"` in keywords
2. Verify the plugin is in the correct directory
3. Check Tabby's console for error messages

### Speech recognition not starting
1. Ensure you have an internet connection
2. Check browser console for errors
3. Verify Web Speech API is supported in your environment

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

MIT

## Credits

Built for [Tabby Terminal](https://tabby.sh) using the Web Speech API.
