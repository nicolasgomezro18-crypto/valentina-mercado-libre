# Valentina Mercado Libre

Aplicación HTML para registrar ventas y rendiciones, publicada en GitHub Pages y conectada a Google Sheets mediante Apps Script. Proyecto independiente de Ferrati.

**Abrir:** https://nicolasgomezro18-crypto.github.io/valentina-mercado-libre/

## Uso

Ingresa tu nombre y el código de acceso compartido por la administradora. Registra ventas manualmente, pega texto o adjunta imágenes para extraer su texto con Tesseract.js. Revisa los datos antes de guardar. Filtra por vendedor, cuenta, fechas y pago; selecciona ventas de una sola persona para hacer una rendición.

Los precios son netos, en pesos chilenos. Total = cantidad × valor unitario. No se descuentan nuevamente comisiones ni envíos. Todos los encabezados de la hoja están en español.

## Conexión

La interfaz carga un puente de Apps Script mediante un iframe y mensajes con origen y canal comprobados. El servidor valida el código del equipo antes de leer o escribir. La hoja permanece privada. No se incluyen ventas ni credenciales en este repositorio.

La implementación de Apps Script debe ejecutarse como su propietario y permitir acceso anónimo; la autorización de datos se realiza en `apiRequest`. La administradora tiene un archivo configurado privado para pegar en Code.gs. Después debe actualizar la implementación existente seleccionando una nueva versión. El código genérico de este repositorio usa propiedades `SPREADSHEET_ID`, `ALLOWED_EMAILS` (administración) y `TEAM_KEY_SHA256` (hash SHA-256 de un código aleatorio de al menos 24 bytes). `APP_ORIGIN_` y `ENDPOINT` fijan el sitio y la implementación.

El código compartido permite a todo el equipo consultar y editar. Los nombres ingresados quedan en la auditoría, pero no son identidades verificadas. El código se mantiene en memoria hasta cerrar o recargar la página. Para revocarlo, configura otro hash y distribuye el nuevo código. No publiques la hoja, códigos de acceso ni archivos privados de configuración.

## Desarrollo y validación

`node build.mjs` genera `index.html` y la copia `apps-script/Index.html`; el servidor solo entrega el puente, no usa esa copia. `node --test tests/*.test.cjs` prueba importes, validaciones, duplicados, concurrencia, rendiciones y autorización. Prueba de navegador con puente simulado comprobada; la conexión real requiere que la administradora actualice su implementación de Google.

GitHub Pages, Sheets, Apps Script y Tesseract no requieren servicios de pago para esta implementación; están sujetos a los límites de sus proveedores. OCR necesita internet para descargar el lector y procesa las imágenes en el navegador.
