import { $ } from "bun";

async function main() {
  // Check for cargo
  const cargo = await $`which cargo`.quiet().nothrow();
  if (cargo.exitCode !== 0) {
    console.error("Error: Rust/Cargo not found.");
    console.error("Install from https://rustup.rs");
    process.exit(1);
  }

  // Check for submodule
  const submodule = await $`ls epub-chapter-splitter/Cargo.toml`.quiet().nothrow();
  if (submodule.exitCode !== 0) {
    console.log("Initializing submodule...");
    await $`git submodule update --init --recursive`;
  }

  // Build epub-chapter-splitter
  console.log("Building epub-chapter-splitter...");
  const build = await $`cd epub-chapter-splitter && cargo build --release`.nothrow();

  if (build.exitCode !== 0) {
    console.error("Build failed.");
    process.exit(1);
  }

  console.log("Setup complete.");
}

main();
