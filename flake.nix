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
        system: pkgs: {
          default = pkgs.mkShellNoCC {
            packages = with pkgs; [
              nodejs
              pnpm
            ];
          };
        }
      );

      formatter = forEachSupportedSystem (_: pkgs: pkgs.nixfmt);
    };
}
