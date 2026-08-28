{
  description = "gufo / strix-halo.cpp official documentation and project website";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        devShells.default = pkgs.mkShell {
          name = "gufo-website-dev";
          packages = with pkgs; [
            nodejs_22
            pnpm
            git
          ];

          shellHook = ''
            echo "=================================================="
            echo "  gufo website development environment (Astro)    "
            echo "=================================================="
            echo "Commands:"
            echo "  pnpm dev     - Start Astro local development server"
            echo "  pnpm build   - Build static production site"
            echo "  pnpm preview - Preview production build locally"
            echo "=================================================="
          '';
        };
      });
}
