# VS Code Extension Analyzer

A web application that analyzes VS Code extension usage across multiple users. The application accepts YAML input with user extension data and fetches metadata from the VS Code Marketplace to provide insights into extension popularity and usage patterns.

## Features

- **YAML Input**: Accepts YAML data with user extension information
- **Real-time Analysis**: Fetches extension metadata directly from VS Code Marketplace
- **Usage Statistics**: Shows extension popularity across users
- **User Breakdown**: Displays individual user extension lists
- **Progress Tracking**: Real-time progress updates during processing
- **Responsive Design**: Works on desktop and mobile devices

## Live Demo

The application is deployed on GitHub Pages and can be accessed at:
[https://michael.github.io/check-extensions](https://michael.github.io/check-extensions)

## YAML Input Format

The application expects YAML data in the following format:

```yaml
# Example YAML data
michael:
  - ms-azuretools.vscode-docker-2.0.0
jon:
  - ms-azuretools.vscode-docker-2.0.0
  - github.vscode-pull-request-github-0.112.0
  - rust-lang.rust-analyzer-0.3.2500-darwin-arm64
```

### Format Rules:
- Username followed by colon (`:`)
- Extension directories listed with dash (`-`) prefix
- Extension names should include version numbers
- Comments start with `#`

## Local Development

### Prerequisites

- Node.js 14.0.0 or higher
- npm

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/michael/check-extensions.git
   cd check-extensions
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run deploy` - Build and deploy to GitHub Pages (requires gh-pages package)

## Data Collection

To collect extension data from VS Code installations:

### On the Server

1. Run the extension access check:
   ```bash
   ./scripts/check_extensions_access.sh
   ```

2. Generate YAML data:
   ```bash
   ./scripts/user_extensions_yaml.sh > input.yaml
   ```

### Legacy Node.js Script

The project also includes a Node.js script for command-line processing:

```bash
npm run analyse-extensions
```

This script processes `input.yaml` and generates `extension-analysis.json` for the old static approach.

## GitHub Pages Deployment

The application is automatically deployed to GitHub Pages using GitHub Actions.

### Manual Deployment

To deploy manually:

1. Install the gh-pages package:
   ```bash
   npm install --save-dev gh-pages
   ```

2. Deploy:
   ```bash
   npm run deploy
   ```

### Automatic Deployment

The GitHub Actions workflow (`.github/workflows/deploy.yml`) automatically:
- Builds the application on push to main branch
- Deploys to GitHub Pages
- Uses the `dist` directory as the source

## Architecture

### Frontend
- **Vite**: Build tool and development server
- **Vanilla JavaScript**: No framework dependencies
- **CSS**: Custom styling with responsive design

### API Integration
- **VS Code Marketplace API**: Fetches extension metadata
- **Rate Limiting**: Built-in delays to respect API limits
- **Error Handling**: Graceful handling of API failures

### Data Processing
- **YAML Parser**: Custom parser for user extension data
- **Extension Parsing**: Regex-based version extraction
- **Statistics Calculation**: Usage analysis and popularity metrics

## Browser Compatibility

The application works in all modern browsers that support:
- ES6+ JavaScript features
- Fetch API
- CSS Grid and Flexbox

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally with `npm run dev`
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Troubleshooting

### Common Issues

1. **CORS Errors**: The application makes direct API calls to VS Code Marketplace. Some browsers may block these requests. Try using a different browser or disabling CORS restrictions for development.

2. **Rate Limiting**: The VS Code Marketplace API has rate limits. The application includes built-in delays, but you may still encounter rate limiting with large datasets.

3. **Build Errors**: Ensure you're using Node.js 14+ and have all dependencies installed with `npm install`.

### Support

For issues and questions, please open an issue on the GitHub repository.
