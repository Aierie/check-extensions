// Fetch and display the extension analysis data
async function loadExtensionData() {
    const app = document.getElementById('app');
    
    try {
        // Fetch the extension analysis JSON file
        const response = await fetch('/extension-analysis.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
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
                                <div class="extension-stat-description">${extension.description}</div>
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
            
            const extensionsHtml = sortedGroupedExtensions.map(({ identifier, extensionVersions, name, description }) => {
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
                            <div class="extension-description">${description}</div>
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
        
    } catch (error) {
        console.error('Error loading extension data:', error);
        app.innerHTML = `
            <div class="error">
                <strong>Error loading extension analysis data:</strong><br>
                ${error.message}<br><br>
                Make sure you have run the extension analysis script first to generate extension-analysis.json
            </div>
        `;
    }
}

// Load the data when the page loads
document.addEventListener('DOMContentLoaded', loadExtensionData); 