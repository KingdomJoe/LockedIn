export const LANG_COLOR: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Rust: '#dea584',
  Go: '#00ADD8',
  Python: '#3572A5',
  Java: '#b07219',
  C: '#555555',
  'C++': '#f34b7d',
  'C#': '#178600',
  Ruby: '#701516',
  PHP: '#4F5D95',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB',
  Svelte: '#ff3e00',
  Vue: '#41b883',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Shell: '#89e051',
  Zig: '#ec915c',
  Elixir: '#6e4a7e',
  Haskell: '#5e5086',
  Lua: '#000080',
  Scala: '#c22d40',
  Clojure: '#db5855',
  OCaml: '#3be133',
  Nix: '#7e7eff',
  MDX: '#fcb32c',
};

export function langColor(name: string | null | undefined): string {
  if (!name) return '#4B5563';
  return LANG_COLOR[name] ?? '#10B981';
}
