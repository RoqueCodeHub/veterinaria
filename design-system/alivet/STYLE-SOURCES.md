# Fuentes de estilos de AliVet

Este inventario distingue las hojas activas de los estilos antiguos archivados tras comprobar su conexión con Angular.

## Fuente visual activa

- `src/styles.css`: hoja global declarada en `angular.json`. Contiene Tailwind, tokens base y patrones compartidos del panel (`.admin-card`, `.admin-control`, `.admin-control-row`, `.admin-segmented`, `.admin-choice-grid`). Editar aquí los patrones transversales.
- Las hojas enlazadas con `styleUrl` en componentes Angular se cargan con cada componente: `src/app/app.css`, `src/app/shared/components/admin-table/admin-table.css`, `src/app/shared/components/ticket-viewer/ticket-viewer.css`, `src/app/shared/components/button/button.css`, `src/app/shared/components/card/card.css`, `src/app/shared/components/metodos-pago/metodos-pago.css`, `src/app/features/auth/login/login.css`, `src/app/features/admin/categorias/categorias.css`, `src/app/features/admin/dashboard/dashboard.css`, `src/app/features/admin/reportes/reportes.css` y `src/app/features/public/countdown/countdown.css`.

## Estilos residuales archivados

Se movieron a `design-system/alivet/residual/src/`, conservando su estructura relativa, los CSS sin `styleUrl`/`styleUrls`, sin import activo desde hojas cargadas y no declarados en `angular.json`. El detalle está en `design-system/alivet/residual/README.md`.

`src/app/layouts/admin-layout/admin-layout.css` también está desconectado, pero permanece en su ruta original para conservar los cambios locales existentes. Está inventariado como residual y no debe considerarse una fuente activa hasta que Angular lo enlace.

La hoja `contacto/contacto-page.css` importaba `shared/styles/page-hero.css`; ambas se archivaron juntas para preservar su relación, pero ese import no activaba estilos porque la hoja de contacto no estaba conectada a Angular. `src/theme.css` tampoco estaba declarado ni importado por la aplicación; no confundirlo con `tailwindcss/theme.css`, que sí importa `src/styles.css`.

## Regla para futuras ediciones

1. Tokens de marca y patrones transversales: `src/styles.css`, documentados en `MASTER.md`.
2. Ajustes exclusivos de pantalla: CSS de componente enlazado con `styleUrl`.
3. Antes de reactivar un estilo archivado, confirmar la conexión en `styleUrl`/`styleUrls` o `angular.json`, migrar sus valores a tokens AliVet y actualizar este inventario.
