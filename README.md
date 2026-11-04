# Kequito

Mi día a día: gastos, comidas, km en moto y gym. App web para iPhone (pantalla de inicio), con datos en Supabase.

- Sin compilación: HTML + CSS + JS. Se publica subiendo la carpeta a GitHub Pages.
- `js/config.js`: URL y anon key de Supabase.
- `supabase/NN_*.sql`: scripts de base de datos, se corren en orden en el SQL Editor.
- En cada cambio de JS/CSS, subir `APP_VERSION` en `index.html` (formato `AAAA.MM.DD` + letra).
