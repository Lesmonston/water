# water-installed-apps

Read-only Windows Uninstall registry inventory for APPS-M35. Only the machine
64-bit, machine 32-bit and current-user roots and each child's DisplayName,
DisplayVersion and InstallLocation values are read, with KEY_READ and view flags.
No environment expansion, program-file inspection, registry mutation or process
launch is performed by the library. Non-Windows collection returns Unsupported.

Parsing and name matching are pure functions. JSON is strict about unknown fields.
Collection retains at most 5000 valid entries and records inaccessible child keys.
The supplied clock is recorded as Unix seconds in collected_at.
The real_smoke example prints only scope counts and collection flags. The three
integration tests include a read-only PowerShell registry comparison; registry
names and paths stay in memory and are never printed in assertion failures.
