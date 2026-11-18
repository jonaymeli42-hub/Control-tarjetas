# Control-tarjetas

## Compras en cuotas vinculadas desde Préstamos

Las financiaciones propias creadas en Control Préstamos pueden aparecer como un gasto en cuotas de la tarjeta. El vínculo conserva el consumo histórico independiente y crea una fila con ID estable, importes por cuota, meses de resumen, fechas de vencimiento, capital e intereses. Los importes se reflejan en las mismas pantallas y totales mensuales que los demás gastos en cuotas. Los registros vinculados se editan o eliminan desde Préstamos; Tarjetas ofrece abrir el origen. Los reintentos actualizan el mismo ID y no duplican consumos.

Las financiaciones recibidas/cargos únicos existentes mantienen su vínculo de un solo pago. Las dos modalidades usan el mismo mecanismo local y sus respaldos Drive/JSON independientes; no comparten credenciales ni sincronizan dispositivos.

## Financiaciones vinculadas (27/10/2026)

En Préstamos, la modalidad de tarjeta/cargos únicos ofrece «Registrar también en Control Tarjetas»: seleccionar tarjeta existente en esa app, fecha del consumo y mes de vencimiento. Crea un consumo en 1 pago por el total a devolver (capital + cargos), responsable y categoría Préstamos. Es optativo; los registros anteriores y las financiaciones mensuales siguen independientes. Los pagos no se vinculan.

Funciona exclusivamente en el mismo origen, dispositivo y perfil de navegador. No es sincronización entre dispositivos ni entre cuentas Google. Cada app mantiene su base local y su copia JSON/Drive independiente. La escritura de la financiación es primero durable; un fallo del destino queda pendiente y se reintenta al abrir cualquiera de las apps o comprobar desde el detalle. Nunca se crea una base vacía de Tarjetas si falta o es ilegible. Abrir Tarjetas con sus datos permite elegir sus tarjetas y enviar su propia copia automática si Drive está conectado.

Los registros usan un ID determinista y conservan la referencia en ambos JSON. Las ediciones y eliminaciones de consumos vinculados se realizan en Préstamos; Tarjetas ofrece abrir el origen. Las eliminaciones explícitas se conservan como `cardLinkRemovals` en el JSON de Préstamos para reintentos. Restaurar un respaldo de Tarjetas puede volver a completar los vínculos activos presentes en Préstamos. Una copia de una sola app no restaura todos los datos de la otra; conservar ambos respaldos. Los registros manuales anteriores no se vinculan por nombre/importe: no marcar la opción para una financiación ya cargada manualmente en Tarjetas sin revisar ese consumo primero.

`financing-link.js` es el mismo módulo en ambos repositorios. Solo modifica el consumo identificado, preservando los registros independientes. Una escritura de Tarjetas marca pendiente su respaldo sin compartir tokens con Préstamos. Los callbacks de copia leen la base persistida para evitar respaldar una vista desactualizada.
