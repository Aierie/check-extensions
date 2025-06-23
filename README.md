# On the server
- Run check_extensions_access.sh to see if there are any issues finding extensions
- Run check_extensions_yaml.sh (+- pipe to a file) to get YAML with the relevant user extension data
- Copy the YAML over to local's `input.yaml`

# On local
- Run `npm run analyse-extensions` to add more info about what the extensions are
- Run `npm run dev`
