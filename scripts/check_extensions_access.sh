#!/bin/bash

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

echo "Script completed." 