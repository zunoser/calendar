{
  description = "A Nix-flake-based Node.js development environment";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { nixpkgs, ... }:

    let
      supportedSystems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
      ];
      forEachSupportedSystem =
        f: nixpkgs.lib.genAttrs supportedSystems (system: f system nixpkgs.legacyPackages.${system});
    in
    {
      devShells = forEachSupportedSystem (
        system: pkgs:
        let
          corepackShims = pkgs.runCommand "corepack-shims" { nativeBuildInputs = [ pkgs.nodejs ]; } ''
            mkdir -p $out/bin
            corepack enable --install-directory $out/bin
          '';
        in
        {
          default = pkgs.mkShellNoCC {
            packages = [
              pkgs.nodejs
              corepackShims
            ];
          };
        }
      );

      formatter = forEachSupportedSystem (_: pkgs: pkgs.nixfmt);
    };
}
