#!/usr/bin/env node

const fs = require("fs");
const https = require("https");

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
function fetchExtensionInfo(identifier) {
  return new Promise((resolve, reject) => {
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

    const options = {
      hostname: "marketplace.visualstudio.com",
      port: 443,
      path: "/_apis/public/gallery/extensionquery",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
        Accept: "application/json;api-version=3.0-preview.1",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const response = JSON.parse(data);
          if (
            response.results &&
            response.results[0] &&
            response.results[0].extensions &&
            response.results[0].extensions.length > 0
          ) {
            const extension = response.results[0].extensions[0];
            resolve({
              name: extension.displayName || extension.extensionName,
              description: extension.shortDescription || extension.description,
            });
          } else {
            resolve({
              name: identifier,
              description: "Extension not found in marketplace",
            });
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on("error", (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    req.write(postData);
    req.end();
  });
}

// Function to process extensions with delay to avoid rate limiting
async function processExtensions(extensions, delayMs = 100) {
  const results = {};
  const processedIdentifiers = new Set();

  for (let i = 0; i < extensions.length; i++) {
    const extension = extensions[i];
    console.log(`Processing ${i + 1}/${extensions.length}: ${extension}`);

    try {
      const parsed = parseExtension(extension);

      // Only fetch metadata if we haven't seen this identifier before
      if (!processedIdentifiers.has(parsed.identifier)) {
        const info = await fetchExtensionInfo(parsed.identifier);
        results[parsed.identifier] = info;
        processedIdentifiers.add(parsed.identifier);

        // Add delay between requests to be respectful to the API
        if (i < extensions.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    } catch (error) {
      console.error(`Error processing ${extension}: ${error.message}`);
      results[parsed.identifier] = {
        name: parsed.identifier,
        description: `Error: ${error.message}`,
      };
    }
  }

  return results;
}

// Function to read YAML input and parse user extensions
function parseYamlInput(yamlInput) {
  const lines = yamlInput.split("\n");
  const users = {};
  const allExtensions = [];
  let currentUser = null;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines
    if (!trimmedLine) continue;

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

// Main function
async function main() {
  try {
    // Read YAML input from stdin or file
    let yamlInput;
    const inputFile = "./input.yaml";
    yamlInput = fs.readFileSync(inputFile, "utf8");

    console.log("Parsing YAML input...");
    const { users, allExtensions } = parseYamlInput(yamlInput);

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

    // Fetch extension metadata
    const extensionsMetadata = await processExtensions(uniqueExtensions);

    // Build the final output structure
    const output = {
      extensions: extensionsMetadata,
      users: users,
    };

    // Save results to file
    const outputFile = "extension-analysis.json";
    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));

    console.log(
      `\n✅ Successfully processed ${Object.keys(users).length} users and ${
        uniqueExtensions.length
      } unique extensions`
    );
    console.log(`📁 Results saved to: ${outputFile}`);

    // Display summary
    console.log("\n📊 Summary:");
    console.log(`- Users: ${Object.keys(users).length}`);
    console.log(`- Total extensions: ${allExtensions.length}`);
    console.log(`- Unique extensions: ${uniqueExtensions.length}`);
    console.log(
      `- Successful metadata fetches: ${
        Object.values(extensionsMetadata).filter(
          (e) => !e.description?.startsWith("Error:")
        ).length
      }`
    );
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  parseExtension,
  fetchExtensionInfo,
  processExtensions,
  parseYamlInput,
};
