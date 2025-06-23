#!/bin/bash

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
done < /etc/passwd
