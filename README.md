# Valentina Mercado Libre

Aplicativo en HTML, CSS y JavaScript con Google Sheets como base de datos y Google Apps Script como servidor y alojamiento. Moneda: pesos chilenos (CLP). Los precios son netos: **total = cantidad × valor unitario**, sin descontar comisiones ni envíos otra vez.

## Funciones

- Registro de órdenes con uno o varios productos, vendedor, cuenta, fecha, referencia y pago.
- Catálogo editable de productos, precios, vendedores y cuentas independientes.
- Captura manual, extracción asistida de texto y lectura de imágenes JPG, PNG y WebP con Tesseract.js.
- Revisión obligatoria de los campos antes de guardar. Los datos no detectados quedan para completar; no se adivina el precio neto a partir de un importe bruto.
- Filtros por vendedor, cuenta, fechas, pago y rendición; exportación CSV de lo filtrado.
- Rendiciones por persona con fecha y total. Se conserva el pago pendiente o pagado; no se vuelve a rendir una misma línea.
- Referencias conservadas como texto, prevención de pedidos duplicados por cuenta, cálculo en el servidor, bloqueo de escrituras concurrentes y reintentos sin duplicación.
- Acceso con Google y lista de correos permitidos. La hoja no necesita ser pública.

## Activar en Google Sheets

1. Abre tu hoja → **Extensiones → Apps Script**.
2. Copia `apps-script/Code.gs` al archivo `Code.gs`. Agrega un archivo HTML llamado **Index** y copia `apps-script/Index.html` completo.
3. En **Configuración del proyecto**, activa «Mostrar el archivo de manifiesto appsscript.json». Reemplaza su contenido con `apps-script/appsscript.json`.
4. En esa misma configuración, agrega estas **Propiedades de la secuencia de comandos**:

   | Propiedad | Valor |
   | --- | --- |
   | `SPREADSHEET_ID` | ID de la hoja: lo que aparece entre `/d/` y `/edit` en su enlace |
   | `ALLOWED_EMAILS` | Tu correo de Google; agrega otros correos separados por comas si corresponde |

5. Ejecuta **setup** desde el editor y autoriza los permisos solicitados. Verifica encabezados y crea pestañas faltantes, sin reemplazar el contenido de otras pestañas.
6. **Implementar → Nueva implementación → Aplicación web**. Ejecutar como: **Usuario que accede a la aplicación web**. Acceso: usuarios con cuenta de Google. El manifiesto usa `USER_ACCESSING` y `ANYONE` (usuarios autenticados, no `ANYONE_ANONYMOUS`).
7. Abre la URL terminada en `/exec`. Cada usuario debe autorizar la aplicación, estar en `ALLOWED_EMAILS` y tener permiso de edición sobre la hoja.
8. En **Productos y personas**, agrega los vendedores antes de la primera venta. La cuenta de Mercado Libre y el vendedor son registros independientes.

Cuando cambies el código, actualiza la implementación con una **nueva versión**. El HTML abierto desde el computador o GitHub Pages es una vista previa sin conexión: `google.script.run` funciona dentro del HTML servido por Apps Script. Para usar la base de datos, abre la URL `/exec`.

## Datos

El aplicativo usa cuatro pestañas: `ML_Ventas`, `ML_Productos`, `ML_Vendedores` y `ML_Cuentas`. Sus encabezados visibles están en español: Fecha de venta, Referencia del pedido, Nombre del vendedor, Cantidad, Valor unitario neto (CLP), Valor total neto (CLP), Estado de pago, entre otros. El código relaciona estos nombres con sus claves internas; conserva los encabezados y el orden de las columnas. Mantén los registros consecutivos y administra ventas desde el aplicativo; no ordenes una columna de forma aislada ni cambies códigos, versiones o totales manualmente.

Si copiaste la primera versión de `Code.gs`, reemplázala por la versión actual para reconocer los encabezados en español. Si ya implementaste la aplicación, publica una nueva versión de esa implementación. El HTML no necesita cambios para esta traducción.

Cada línea de producto conserva el precio, producto, cuenta y vendedor de la venta original. Cambiar un precio del catálogo solo afecta propuestas para nuevas ventas. Dos líneas del mismo pedido comparten `orderId`. La referencia puede repetirse en cuentas distintas, pero no como una nueva orden dentro de la misma cuenta.

Una rendición puede incluir pagos pendientes: su importe es el total neto de las líneas seleccionadas, no una confirmación de dinero recibido. El formulario muestra la parte pagada y pendiente. Después se puede actualizar el pago; no se permite cancelar una línea ya rendida. En el listado, el pago se modifica por línea de producto. Los importes de ventas canceladas se excluyen de los indicadores.

## Texto e imágenes

Ejemplo de formato (datos ilustrativos):

```text
Fecha: 13/09/2026
Vendedor: Persona de prueba
Cuenta: Cuenta de prueba
Pedido: 001234567
Producto: Producto de prueba
Cantidad: 2
Valor unitario: 10.000
Estado: Pendiente
```

Para varios productos, repite `Producto`, `Cantidad` y `Valor unitario` dentro de la misma orden. El texto libre también puede sugerir fecha, referencia, producto y cantidad. Para mayor precisión utiliza las etiquetas del ejemplo.

Las imágenes se leen en el navegador; no se suben a una API de OCR ni se guardan en Sheets. El navegador descarga Tesseract.js y el modelo de español desde una CDN la primera vez. Admite hasta 5 imágenes de 10 MB por lote. Usa un lote por orden, y revisa siempre la extracción. No hay sincronización automática con la API de Mercado Libre.

## Costos y límites

No requiere API de IA paga, dominio ni servidor contratado. Apps Script y Sheets están sujetos a las cuotas de Google. El OCR consume recursos del dispositivo y requiere internet para descargar su motor. El aplicativo carga las ventas al abrir; está pensado para un equipo pequeño. Volúmenes grandes pueden requerir paginación o una base de datos diferente.

Documentación: [cuotas de Apps Script](https://developers.google.com/apps-script/guides/services/quotas), [aplicaciones web](https://developers.google.com/apps-script/guides/web), [comunicación HTML-servidor](https://developers.google.com/apps-script/guides/html/communication), [Tesseract.js](https://github.com/naptha/tesseract.js).

## Desarrollo

Requiere Node.js 20 o posterior. No necesita instalación de paquetes para compilar o ejecutar las pruebas.

```sh
npm run build
npm test
```

Modifica `src/` y ejecuta el build: genera `index.html` y `apps-script/Index.html`. El backend está en `apps-script/Code.gs`. Las pruebas verifican lógica y servidor con dobles de Google Sheets; no reemplazan una prueba de la implementación autenticada de Google.

Este repositorio contiene código y pruebas con datos ficticios, sin registros de ventas ni credenciales. Configura la hoja y los correos permitidos en las propiedades privadas de Apps Script, nunca en el HTML público.
