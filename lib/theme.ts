export function toggleTheme() {
  const isDark = document.documentElement.classList.contains('dark');
  const newTheme = isDark ? 'light' : 'dark';
  
  document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', newTheme);
}

export function getTheme() {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
} 