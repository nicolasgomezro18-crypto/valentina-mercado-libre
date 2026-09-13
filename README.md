# Valentina Mercado Libre

Aplicación HTML para registrar ventas y rendiciones, publicada en GitHub Pages y conectada a Google Sheets mediante Apps Script. Proyecto independiente de Ferrati.

**Abrir:** https://nicolasgomezro18-crypto.github.io/valentina-mercado-libre/

## Uso

El Dashboard presenta ventas netas, unidades, pagos, gráficos por mes, producto, vendedor y cuenta, y el estado de las rendiciones. Sus filtros de vendedor, cuenta y fechas son independientes de los de Movimientos. Los registros sin fecha no entran en un período filtrado y se señalan en el dashboard. Los registros sin referencia no se cuentan como órdenes identificadas. Las rendiciones históricas sin confirmación se muestran por separado.

Ingresa tu nombre y el código de acceso compartido por la administradora. El registro es únicamente manual. Selecciona el producto y completa los datos antes de guardar. Se retiraron la lectura de texto y el OCR de imágenes. Filtra por vendedor, cuenta, fechas y pago; selecciona ventas de una sola persona para hacer una rendición.

Los precios son netos, en pesos chilenos. Total = cantidad × valor unitario. No se descuentan nuevamente comisiones ni envíos. Todos los encabezados de la hoja están en español.

## Conexión

La interfaz carga un puente de Apps Script mediante un iframe y mensajes con origen y canal comprobados. En Chrome compatible utiliza `credentialless` para aislar la conexión de las sesiones de Google del navegador. El código del equipo se sigue validando en el servidor. El servidor valida el código del equipo antes de leer o escribir. La hoja permanece privada. No se incluyen ventas ni credenciales en este repositorio.

La implementación de Apps Script debe ejecutarse como su propietario y permitir acceso anónimo; la autorización de datos se realiza en `apiRequest`. La administradora tiene un archivo configurado privado para pegar en Code.gs. Después debe actualizar la implementación existente seleccionando una nueva versión. El código genérico de este repositorio usa propiedades `SPREADSHEET_ID`, `ALLOWED_EMAILS` (administración) y `TEAM_KEY_SHA256` (hash SHA-256 de un código aleatorio de al menos 24 bytes). `APP_ORIGIN_` y `ENDPOINT` fijan el sitio y la implementación.

El perfil Equipo permite consultar, registrar y editar ventas, pero no eliminarlas. El perfil Administrador usa un código separado, cuyo hash se configura en `ADMIN_KEY_SHA256`. Los permisos se validan en el servidor y no dependen del nombre escrito ni de la opción elegida en el formulario. El administrador puede eliminar una línea de venta después de confirmar sus detalles e indicar un motivo. Se conserva la fila con estado `Eliminado`, quién la eliminó, fecha, motivo y estado anterior. Se excluye de las ventas, gráficos y rendiciones visibles. Las otras líneas del pedido no se eliminan. Los nombres ingresados quedan en la auditoría, pero no son identidades verificadas. El código se mantiene en memoria hasta cerrar o recargar la página. Para revocarlo, configura otro hash y distribuye el nuevo código. No publiques la hoja, códigos de acceso ni archivos privados de configuración.

## Desarrollo y validación

`node build.mjs` genera `index.html` y la copia `apps-script/Index.html`; el servidor solo entrega el puente, no usa esa copia. `node --test tests/*.test.cjs` prueba importes, validaciones, duplicados, concurrencia, rendiciones y autorización. Interfaz comprobada con emulación de pantallas de 375, 390, 430, 844 y 1440 píxeles. En iPhone se presentan tarjetas de ventas, navegación inferior, controles táctiles y áreas seguras. No se verificó en un iPhone físico; WebKit de Playwright no está disponible para la versión de macOS de este equipo. Conexión real de lectura a Google Sheets verificada con la implementación actual. Las pruebas de escritura y eliminación usan un servidor simulado para no modificar ventas reales. El perfil administrador requiere actualizar la implementación de Apps Script con la versión 3; la interfaz mantiene el acceso del equipo compatible con la implementación anterior mientras se realiza esa actualización.

GitHub Pages, Sheets y Apps Script no requieren servicios de pago para esta implementación; están sujetos a los límites de sus proveedores.
