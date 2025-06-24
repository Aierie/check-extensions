// Function to parse extension identifier and version
function parseExtension(extensionString) {
    // Handle extensions with version suffixes like -darwin-arm64
    const match = extensionString.match(
        /^(.+?)-(\d+\.\d+\.\d+(?:\.\d+)?)(?:-darwin-arm64)?$/
    );
    if (match) {
        return {
            identifier: match[1],
            version: match[2],
        };
    }

    // Fallback for extensions without version
    return {
        identifier: extensionString,
        version: null,
    };
}

// Function to fetch extension information from VS Code marketplace
async function fetchExtensionInfo(identifier) {
    const url = `https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery`;

    const postData = JSON.stringify({
        filters: [
            {
                criteria: [
                    {
                        filterType: 7,
                        value: identifier,
                    },
                ],
            },
        ],
        flags: 0x1,
    });

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json;api-version=3.0-preview.1',
        },
        body: postData,
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (
        data.results &&
        data.results[0] &&
        data.results[0].extensions &&
        data.results[0].extensions.length > 0
    ) {
        const extension = data.results[0].extensions[0];
        return {
            name: extension.displayName || extension.extensionName,
            description: extension.shortDescription || extension.description,
            publisher: extension.publisher?.displayName || extension.publisher?.publisherName || "Unknown",
        };
    } else {
        return {
            name: identifier,
            description: "Extension not found in marketplace",
            publisher: "Unknown",
        };
    }
}

// Function to process extensions with delay to avoid rate limiting
async function processExtensions(extensions, progressCallback) {
    const results = {};
    const processedIdentifiers = new Set();

    for (let i = 0; i < extensions.length; i++) {
        const extension = extensions[i];
        
        if (progressCallback) {
            progressCallback(i + 1, extensions.length, extension);
        }

        try {
            const parsed = parseExtension(extension);

            // Only fetch metadata if we haven't seen this identifier before
            if (!processedIdentifiers.has(parsed.identifier)) {
                const info = await fetchExtensionInfo(parsed.identifier);
                results[parsed.identifier] = info;
                processedIdentifiers.add(parsed.identifier);

                // Add delay between requests to be respectful to the API
                if (i < extensions.length - 1) {
                    await new Promise((resolve) => setTimeout(resolve, 100));
                }
            }
        } catch (error) {
            console.error(`Error processing ${extension}: ${error.message}`);
            const parsed = parseExtension(extension);
            results[parsed.identifier] = {
                name: parsed.identifier,
                description: `Error: ${error.message}`,
                publisher: "Unknown",
            };
        }
    }

    return results;
}

// Function to parse YAML input and extract user extensions
function parseYamlInput(yamlInput) {
    const lines = yamlInput.split("\n");
    const users = {};
    const allExtensions = [];
    let currentUser = null;

    for (const line of lines) {
        const trimmedLine = line.trim();

        // Skip empty lines and comments
        if (!trimmedLine || trimmedLine.startsWith('#')) continue;

        // Check if this is a username line (ends with colon)
        if (trimmedLine.endsWith(":")) {
            currentUser = trimmedLine.slice(0, -1); // Remove the colon
            users[currentUser] = [];
        }
        // Check if this is an extension line (starts with dash)
        else if (trimmedLine.startsWith("- ") && currentUser) {
            const extensionDirname = trimmedLine.slice(2); // Remove the "- "
            const parsed = parseExtension(extensionDirname);

            users[currentUser].push({
                identifier: parsed.identifier,
                version: parsed.version,
                originalDirname: extensionDirname,
            });

            allExtensions.push(extensionDirname);
        }
    }

    return { users, allExtensions };
}

// Function to display extension analysis results
function displayResults(data) {
    const app = document.getElementById('app');
    
    // Calculate statistics
    const totalUsers = Object.keys(data.users).length;
    const totalExtensions = Object.values(data.users).flat().length;
    const uniqueExtensions = Object.keys(data.extensions).length;
    
    // Calculate how many users have each extension (count each user only once per extension)
    const extensionUsage = {};
    Object.values(data.users).forEach(userExtensions => {
        // Get unique extension identifiers for this user (to avoid counting multiple versions)
        const uniqueUserExtensions = new Set();
        userExtensions.forEach(extension => {
            uniqueUserExtensions.add(extension.identifier);
        });
        
        // Count each unique extension once per user
        uniqueUserExtensions.forEach(identifier => {
            extensionUsage[identifier] = (extensionUsage[identifier] || 0) + 1;
        });
    });
    
    // Sort extensions by usage (most popular first)
    const sortedExtensions = Object.entries(extensionUsage)
        .map(([identifier, count]) => {
            const extensionInfo = data.extensions[identifier] || {
                name: identifier,
                description: 'Extension information not available'
            };
            return { identifier, count, ...extensionInfo };
        })
        .sort((a, b) => b.count - a.count);
    
    // Generate statistics section HTML
    const statsSectionHtml = `
        <div class="stats-section">
            <h2>Extension Usage Statistics</h2>
            <div class="extension-stats">
                ${sortedExtensions.map(extension => `
                    <div class="extension-stat-item">
                        <div class="extension-stat-info">
                            <div class="extension-stat-name">
                                <a href="https://marketplace.visualstudio.com/items?itemName=${extension.identifier}" target="_blank" class="extension-link">
                                    ${extension.name}
                                </a>
                            </div>
                            <div class="extension-stat-description">
                                <div>${extension.description}</div>
                                <div style="font-size: 12px; color: #0366d6; margin-top: 4px;">
                                    by ${extension.publisher || 'Unknown'}
                                </div>
                            </div>
                        </div>
                        <div class="extension-stat-count">
                            <span class="count-number">${extension.count}</span>
                            <span class="count-label">user${extension.count !== 1 ? 's' : ''}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    // Generate HTML for each user
    const usersHtml = Object.entries(data.users).map(([username, extensions]) => {
        // Group extensions by identifier
        const groupedExtensions = {};
        extensions.forEach(extension => {
            if (!groupedExtensions[extension.identifier]) {
                groupedExtensions[extension.identifier] = [];
            }
            groupedExtensions[extension.identifier].push(extension);
        });
        
        // Sort grouped extensions alphabetically by name
        const sortedGroupedExtensions = Object.entries(groupedExtensions)
            .map(([identifier, extensionVersions]) => {
                const extensionInfo = data.extensions[identifier] || {
                    name: identifier,
                    description: 'Extension information not available'
                };
                return { identifier, extensionVersions, ...extensionInfo };
            })
            .sort((a, b) => a.name.localeCompare(b.name));
        
        const extensionsHtml = sortedGroupedExtensions.map(({ identifier, extensionVersions, name, description, publisher }) => {
            // Create version tags
            const versionTags = extensionVersions.map(extension => 
                `<span class="extension-version">v${extension.version}</span>`
            ).join('');
            
            return `
                <li class="extension-item">
                    <div class="extension-info">
                        <div class="extension-name">
                            <a href="https://marketplace.visualstudio.com/items?itemName=${identifier}" target="_blank" class="extension-link">
                                ${name}
                            </a>
                        </div>
                        <div class="extension-description">
                            <div>${description}</div>
                            <div style="font-size: 12px; color: #0366d6; margin-top: 2px;">
                                by ${publisher || 'Unknown'}
                            </div>
                        </div>
                    </div>
                    <div class="extension-versions">
                        ${versionTags}
                    </div>
                </li>
            `;
        }).join('');
        
        // Count unique extensions for the user
        const uniqueExtensionCount = Object.keys(groupedExtensions).length;
        
        return `
            <div class="user-section">
                <div class="user-header">
                    ${username}
                    <span class="extension-count">${uniqueExtensionCount} unique extensions</span>
                </div>
                <ul class="user-extensions">
                    ${extensionsHtml}
                </ul>
            </div>
        `;
    }).join('');
    
    // Display the data
    app.innerHTML = `
        <div class="stats">
            <div class="stat-item">
                <span>Users:</span>
                <span class="stat-number">${totalUsers}</span>
            </div>
            <div class="stat-item">
                <span>Total Extensions:</span>
                <span class="stat-number">${totalExtensions}</span>
            </div>
            <div class="stat-item">
                <span>Unique Extensions:</span>
                <span class="stat-number">${uniqueExtensions}</span>
            </div>
        </div>
        ${statsSectionHtml}
        <h2>User Extension Lists</h2>
        ${usersHtml}
    `;
}

// Function to update progress bar
function updateProgress(current, total, currentExtension) {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const percentage = Math.round((current / total) * 100);
    
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = `Processing ${current}/${total}: ${currentExtension}`;
}

// Function to show error message
function showError(message) {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="error">
            <strong>Error:</strong><br>
            ${message}
        </div>
    `;
}

// Function to show loading state
function showLoading() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="loading">
            <div>Processing YAML data...</div>
        </div>
    `;
}

// Main function to analyze extensions
async function analyzeExtensions(yamlInput) {
    try {
        showLoading();
        
        console.log("Parsing YAML input...");
        const { users, allExtensions } = parseYamlInput(yamlInput);

        if (Object.keys(users).length === 0) {
            throw new Error("No valid user data found in YAML. Please check the format.");
        }

        console.log(
            `Found ${Object.keys(users).length} users with ${
                allExtensions.length
            } total extensions`
        );

        // Get unique extensions to fetch metadata
        const uniqueExtensions = [...new Set(allExtensions)];
        console.log(
            `Fetching metadata for ${uniqueExtensions.length} unique extensions...`
        );

        // Show progress container
        const progressContainer = document.getElementById('progressContainer');
        progressContainer.style.display = 'block';

        // Fetch extension metadata with progress updates
        const extensionsMetadata = await processExtensions(uniqueExtensions, updateProgress);

        // Hide progress container
        progressContainer.style.display = 'none';

        // Build the final output structure
        const output = {
            extensions: extensionsMetadata,
            users: users,
        };

        // Store the data globally for saving
        window.lastAnalyzedData = output;

        // Automatically save the data to localStorage
        saveDataToLocalStorage(output, true);

        console.log(
            `✅ Successfully processed ${Object.keys(users).length} users and ${
                uniqueExtensions.length
            } unique extensions`
        );

        // Display results
        displayResults(output);

    } catch (error) {
        console.error('Error analyzing extensions:', error);
        showError(error.message);
        
        // Hide progress container on error
        document.getElementById('progressContainer').style.display = 'none';
    }
}

// Example YAML data
const exampleYaml = `# Example YAML data
michael:
  - ms-azuretools.vscode-docker-2.0.0
jon:
  - ms-azuretools.vscode-docker-2.0.0
  - github.vscode-pull-request-github-0.112.0
  - rust-lang.rust-analyzer-0.3.2500-darwin-arm64`;

// Script contents
const accessScriptContent = `#!/bin/bash

# Script to list each user's home directory on a machine
# This script parses /etc/passwd to extract username and home directory
# and checks for .vscode-server/extensions folder

# Function to read and display extensions from a given path
read_extensions() {
    local extensions_path="$1"
    
    if [ ! -d "$extensions_path" ]; then
        echo "  ✗ No VS Code Server extensions folder found"
        return
    fi
    
    echo "  ✓ VS Code Server extensions found: $extensions_path"
    
    # Count number of extension folders
    local extension_count=$(find "$extensions_path" -maxdepth 1 -type d | wc -l)
    # Subtract 1 for the parent directory itself
    extension_count=$((extension_count - 1))
    echo "  📦 Number of extensions: $extension_count"
    
    # List the extension names (folders)
    if [ $extension_count -gt 0 ]; then
        echo "  📋 Extension names:"
        find "$extensions_path" -maxdepth 1 -type d -not -path "$extensions_path" | while read -r extension_path; do
            local extension_name=$(basename "$extension_path")
            echo "    - $extension_name"
        done
    fi
}

echo "User Home Directories and VS Code Server Extensions:"
echo "=================================================="

# Check if /etc/passwd exists and is readable
if [ ! -r /etc/passwd ]; then
    echo "Error: Cannot read /etc/passwd file"
    exit 1
fi

# Parse /etc/passwd file
# Format: username:password:UID:GID:comment:home:shell
# We extract username (field 1) and home directory (field 6)
while IFS=: read -r username password uid gid comment home shell; do
    # Skip lines that don't have 7 fields (malformed)
    if [ -n "$username" ] && [ -n "$home" ]; then
        # Only check directories that contain the word "home"
        if [[ "$home" == *"home"* ]]; then
            # Check if home directory exists
            if [ -d "$home" ]; then
                # Check if current user has access to the directory
                if [ -r "$home" ]; then
                    echo "$username: $home"
                    
                    # Check for .vscode-server/extensions folder
                    vscode_extensions_path="$home/.vscode-server/extensions"
                    read_extensions "$vscode_extensions_path"
                else
                    echo "$username: $home (skipped - no read access)"
                fi
            else
                echo "$username: $home (directory does not exist)"
            fi
            echo ""
        fi
    fi
done < /etc/passwd

echo "Script completed."`;

const yamlScriptContent = `#!/bin/bash

# Script to list each user's home directory on a machine
# This script parses /etc/passwd to extract username and home directory
# and checks for .vscode-server/extensions folder

# Function to read and display extensions from a given path
read_extensions() {
    local extensions_path="$1"
    
    if [ ! -d "$extensions_path" ]; then
        return
    fi
    
    # List the extension names (folders)
    find "$extensions_path" -maxdepth 1 -type d -not -path "$extensions_path" | while read -r extension_path; do
        local extension_name=$(basename "$extension_path")
        echo "  - $extension_name"
    done
}

# Check if /etc/passwd exists and is readable
if [ ! -r /etc/passwd ]; then
    echo "Error: Cannot read /etc/passwd file"
    exit 1
fi

# Parse /etc/passwd file
# Format: username:password:UID:GID:comment:home:shell
# We extract username (field 1) and home directory (field 6)
first_user=true
while IFS=: read -r username password uid gid comment home shell; do
    # Skip lines that don't have 7 fields (malformed)
    if [ -n "$username" ] && [ -n "$home" ]; then
        # Only check directories that contain the word "home"
        if [[ "$home" == *"home"* ]]; then
            # Check if home directory exists and is readable
            if [ -d "$home" ] && [ -r "$home" ]; then
                # Check for .vscode-server/extensions folder
                vscode_extensions_path="$home/.vscode-server/extensions"
                if [ -d "$vscode_extensions_path" ]; then
                    # Output username and extensions in YAML format
                    echo "$username:"
                    read_extensions "$vscode_extensions_path"
                fi
            fi
        fi
    fi
done < /etc/passwd`;

// Function to copy text to clipboard
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showCopyFeedback();
    } catch (err) {
        console.error('Failed to copy: ', err);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showCopyFeedback();
    }
}

// Function to show copy feedback
function showCopyFeedback(message = 'Copied to clipboard!') {
    const feedback = document.getElementById('copyFeedback');
    feedback.textContent = message;
    feedback.classList.add('show');
    setTimeout(() => {
        feedback.classList.remove('show');
    }, 2000);
}

// Function to save data to localStorage
function saveDataToLocalStorage(data, autoSave = false) {
    try {
        localStorage.setItem('vscodeExtensionData', JSON.stringify(data));
        if (autoSave) {
            showCopyFeedback('Data automatically saved!');
        } else {
            showCopyFeedback('Data saved successfully!');
        }
        console.log('Data saved to localStorage');
    } catch (error) {
        console.error('Error saving data to localStorage:', error);
        showError('Failed to save data to localStorage. Data may be too large.');
    }
}

// Function to load data from localStorage
function loadDataFromLocalStorage() {
    try {
        const savedData = localStorage.getItem('vscodeExtensionData');
        if (savedData) {
            const data = JSON.parse(savedData);
            displayResults(data);
            showCopyFeedback('Data restored successfully!');
            return data;
        } else {
            showError('No saved data found in localStorage.');
            return null;
        }
    } catch (error) {
        console.error('Error loading data from localStorage:', error);
        showError('Failed to load data from localStorage. Data may be corrupted.');
        return null;
    }
}

// Function to clear saved data from localStorage
function clearSavedData() {
    try {
        localStorage.removeItem('vscodeExtensionData');
        showCopyFeedback('Saved data cleared!');
        console.log('Saved data cleared from localStorage');
        // Reset the UI to initial state
        document.getElementById('app').innerHTML = `
            <div class="loading">Enter YAML data above and click "Analyze Extensions" to get started.</div>
        `;
    } catch (error) {
        console.error('Error clearing data from localStorage:', error);
        showError('Failed to clear saved data from localStorage.');
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    const yamlInput = document.getElementById('yamlInput');
    const analyzeButton = document.getElementById('analyzeButton');
    const loadExample = document.getElementById('loadExample');
    const copyAccessScript = document.getElementById('copyAccessScript');
    const copyYamlScript = document.getElementById('copyYamlScript');
    const clearDataButton = document.getElementById('clearDataButton');

    // Check for saved data and restore automatically
    const savedData = localStorage.getItem('vscodeExtensionData');
    if (savedData) {
        try {
            const data = JSON.parse(savedData);
            window.lastAnalyzedData = data;
            displayResults(data);
            showCopyFeedback('Previous data restored automatically!');
        } catch (error) {
            console.error('Error restoring data from localStorage:', error);
            // Don't show error to user on page load, just log it
        }
    }

    // Handle analyze button click
    analyzeButton.addEventListener('click', async function() {
        const input = yamlInput.value.trim();
        if (!input) {
            showError("Please enter YAML data to analyze.");
            return;
        }

        // Disable button during processing
        analyzeButton.disabled = true;
        analyzeButton.textContent = 'Processing...';

        try {
            await analyzeExtensions(input);
        } finally {
            // Re-enable button
            analyzeButton.disabled = false;
            analyzeButton.textContent = 'Analyze Extensions';
        }
    });

    // Handle load example click
    loadExample.addEventListener('click', function(e) {
        e.preventDefault();
        yamlInput.value = exampleYaml;
    });

    // Handle copy access script click
    copyAccessScript.addEventListener('click', function() {
        copyToClipboard(accessScriptContent);
    });

    // Handle copy YAML script click
    copyYamlScript.addEventListener('click', function() {
        copyToClipboard(yamlScriptContent);
    });

    // Handle clear data button click
    clearDataButton.addEventListener('click', function() {
        if (confirm('Are you sure you want to clear all saved data?')) {
            clearSavedData();
        }
    });

    // Handle Enter key in textarea
    yamlInput.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'Enter') {
            analyzeButton.click();
        }
    });
}); 