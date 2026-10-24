// Cargo external subcommands receive only arguments following their name.
// Keep the same mirror settings and deny-warnings/locked/offline boundaries.
export function cargoMirrorArguments(args, mirrorArguments) {
  return args[0] === 'clippy'
    ? [args[0], ...mirrorArguments, ...args.slice(1)]
    : [...mirrorArguments, ...args];
}
