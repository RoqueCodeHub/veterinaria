# Estilos residuales

Este directorio conserva CSS desconectado de la aplicación Angular. Los archivos se movieron desde `src/` después de revisar `styleUrl`/`styleUrls`, imports y `angular.json`; su estructura interna se conserva para mantener intactos los imports entre los estilos archivados.

Estos archivos no afectan la interfaz actual. No editar aquí para cambiar pantallas activas. Si alguno vuelve a ser necesario, primero enlazarlo explícitamente desde el componente o la configuración global, migrar sus valores a los tokens de `src/styles.css` y actualizar `../STYLE-SOURCES.md`.

El archivo `src/theme.css` archivado no debe confundirse con `tailwindcss/theme.css`, que es un import del paquete Tailwind activo.
